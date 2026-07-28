import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { deleteObjects, getStorageConfig, objectKey } from '../lib/storage'
import { MEDIA_PREFIX, mediaFilenames } from '../lib/mediaVariants'

/**
 * Clean the media library — the one-off sweep for uploads nothing points at.
 *
 *   pnpm clean:media                     report only, changes nothing
 *   pnpm clean:media --apply             delete the unused uploads
 *   pnpm clean:media --apply --prune-storage   also delete stray bucket files
 *   pnpm clean:media --min-age-hours 48  widen the grace period (default 24)
 *
 * Going forward, uploads are removed as they stop being used (see
 * `hooks/cleanUpMedia.ts`). This is for what accumulated before that existed,
 * and as the safety net for the paths that still leak — an upload that
 * succeeded on a form whose save then failed belongs to nothing and no hook
 * will ever hear about it.
 *
 * ## Why this reads foreign keys instead of the config
 *
 * The hooks ask Payload which documents reference an upload, which is exactly
 * right for "did this edit orphan something" and wrong for "is this safe to
 * delete forever". A query answers for the current shape of the config;
 * deletion has to answer for the database as it actually is, including the
 * per-version rows of drafted collections and columns left behind by fields
 * that no longer exist. Postgres knows every one of those, because Payload
 * declares them as foreign keys to `media`. Anything holding a reference is
 * found by asking the constraint catalogue, whether or not the code still
 * remembers it.
 *
 * Text and JSON columns are swept separately for embedded references —
 * a rich-text upload node, a storage URL pasted into HTML — since those carry
 * no constraint.
 */

interface Options {
  apply: boolean
  pruneStorage: boolean
  minAgeHours: number
  force: boolean
}

const parseArgs = (argv: string[]): Options => ({
  apply: argv.includes('--apply'),
  pruneStorage: argv.includes('--prune-storage'),
  force: argv.includes('--force'),
  minAgeHours: Number(argv[argv.indexOf('--min-age-hours') + 1]) || 24,
})

/**
 * Tables whose rows mention media without depending on it.
 *
 * `payload_locked_documents_rels` records that someone has a document open in
 * the admin panel, and `audit_logs` records what happened in the past — neither
 * is a reason to keep a file, and treating them as references would make an
 * upload immortal the moment anyone looked at it.
 */
const NOT_REFERENCES = new Set([
  'payload_locked_documents_rels',
  'payload_preferences',
  'payload_kv',
  'audit_logs',
])

type Sql = (text: string, params?: unknown[]) => Promise<{ rows: any[] }>

/** Every media id held by a foreign key, anywhere in the schema. */
const referencedByForeignKey = async (sql: Sql): Promise<Set<number>> => {
  const { rows: constraints } = await sql(`
    select
      con.conrelid::regclass::text as table_name,
      (select att.attname
         from unnest(con.conkey) k
         join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k
         limit 1) as column_name
    from pg_constraint con
    where con.contype = 'f' and con.confrelid = 'media'::regclass
  `)

  const referenced = new Set<number>()

  for (const { table_name, column_name } of constraints) {
    if (NOT_REFERENCES.has(table_name)) continue
    const { rows } = await sql(
      `select distinct "${column_name}" as id from "${table_name}" where "${column_name}" is not null`,
    )
    for (const row of rows) referenced.add(Number(row.id))
  }

  return referenced
}

/**
 * Media ids and filenames mentioned inside text and JSON columns.
 *
 * Two shapes count: a Lexical upload node (`"relationTo":"media"`) and a public
 * storage URL, which is how an image reaches HTML written in the rich-text
 * editor. Both are references that no constraint protects.
 */
const referencedInContent = async (
  sql: Sql,
  byFilename: Map<string, number>,
): Promise<Set<number>> => {
  const referenced = new Set<number>()

  const { rows: columns } = await sql(`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and data_type in ('text', 'character varying', 'json', 'jsonb')
    order by table_name, column_name
  `)

  for (const { table_name, column_name } of columns) {
    if (table_name === 'media' || NOT_REFERENCES.has(table_name)) continue
    if (table_name.startsWith('payload_')) continue

    const { rows } = await sql(
      `select "${column_name}"::text as value from "${table_name}"
       where "${column_name}"::text like '%"relationTo":"media"%'
          or "${column_name}"::text like '%/storage/v1/object/%'`,
    )

    for (const { value } of rows) {
      for (const match of value.matchAll(/"relationTo":"media"[^}]*?"value":\s*"?(\d+)/g)) {
        referenced.add(Number(match[1]))
      }
      for (const match of value.matchAll(/\/storage\/v1\/object\/[^"'\s\\]+/g)) {
        const filename = decodeURIComponent(match[0].split('/').pop() || '')
        const id = byFilename.get(filename)
        if (id !== undefined) referenced.add(id)
      }
    }
  }

  return referenced
}

/** Every object under the media prefix, paged out of the storage list API. */
const listBucket = async (): Promise<Array<{ name: string; size: number }>> => {
  const storage = getStorageConfig()
  const objects: Array<{ name: string; size: number }> = []
  let offset = 0

  while (true) {
    const res = await fetch(`${storage.baseUrl}/storage/v1/object/list/${storage.bucket}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${storage.serviceRoleKey}`,
        apikey: storage.serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prefix: MEDIA_PREFIX,
        limit: 1000,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      }),
    })

    if (!res.ok) throw new Error(`Storage list failed: ${res.status} ${await res.text()}`)

    const batch = (await res.json()) as Array<{ name: string; metadata?: { size?: number } }>
    for (const object of batch) objects.push({ name: object.name, size: object.metadata?.size ?? 0 })
    if (batch.length < 1000) break
    offset += 1000
  }

  return objects
}

const mb = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2))
  const payload = await getPayload({ config })
  const pool = (payload.db as unknown as { pool: { query: Sql } }).pool
  const sql: Sql = (text, params) => pool.query(text, params)

  const { rows: media } = await sql(
    `select id, filename, filesize, created_at, mime_type from media order by id`,
  )
  const byFilename = new Map<string, number>(
    media.filter((m) => m.filename).map((m) => [m.filename as string, Number(m.id)]),
  )

  const referenced = await referencedByForeignKey(sql)
  for (const id of await referencedInContent(sql, byFilename)) referenced.add(id)

  const cutoff = Date.now() - options.minAgeHours * 60 * 60 * 1000
  const unused = media.filter((m) => !referenced.has(Number(m.id)))
  const tooNew = unused.filter((m) => new Date(m.created_at).getTime() > cutoff)
  const deletable = unused.filter((m) => new Date(m.created_at).getTime() <= cutoff)
  const bytes = deletable.reduce((total, m) => total + Number(m.filesize || 0), 0)

  console.log(`Media library: ${media.length} uploads, ${referenced.size} in use`)
  console.log(`  unused:      ${unused.length}`)
  if (tooNew.length) {
    console.log(
      `  held back:   ${tooNew.length} uploaded in the last ${options.minAgeHours}h ` +
        `(a file uploaded seconds ago may belong to a form nobody has saved yet)`,
    )
  }
  console.log(`  deletable:   ${deletable.length} (${mb(bytes)})`)

  for (const m of deletable.slice(0, 20)) {
    console.log(`    ${m.id}  ${m.filename}  ${mb(Number(m.filesize || 0))}`)
  }
  if (deletable.length > 20) console.log(`    … and ${deletable.length - 20} more`)

  // A scan that finds almost everything unused has usually failed to find the
  // references, not found a library that is 90% dead. Refuse rather than empty
  // the site.
  const share = media.length ? deletable.length / media.length : 0
  if (options.apply && share > 0.9 && !options.force) {
    console.error(
      `\nRefusing to delete ${Math.round(share * 100)}% of the library. ` +
        `That usually means the reference scan is broken, not that the library is. ` +
        `Re-run with --force if it really is correct.`,
    )
    process.exit(1)
  }

  const deletedIds = new Set<number>()

  if (!options.apply) {
    console.log(`\nNothing was changed. Re-run with --apply to delete.`)
  } else {
    for (const m of deletable) {
      try {
        // Deleted through Payload so the cloud-storage adapter runs and takes
        // the file and its sized variants with the row.
        await payload.delete({ collection: 'media', id: m.id })
        deletedIds.add(Number(m.id))
        if (deletedIds.size % 25 === 0) {
          console.log(`  deleted ${deletedIds.size}/${deletable.length}…`)
        }
      } catch (error) {
        console.error(
          `  failed to delete ${m.id} (${m.filename}):`,
          error instanceof Error ? error.message : error,
        )
      }
    }
    console.log(`\nDeleted ${deletedIds.size} unused upload(s), ${mb(bytes)} freed.`)
  }

  if (options.pruneStorage) {
    // Whatever still has a row keeps its files — including any delete that
    // failed a moment ago, whose row is therefore still there.
    const remaining = media.filter((m) => !deletedIds.has(Number(m.id)))
    const known = new Set<string>()
    for (const m of remaining) {
      if (!m.filename) continue
      for (const name of mediaFilenames(m.filename as string)) known.add(name)
    }

    const objects = await listBucket()
    const stray = objects.filter((object) => !known.has(object.name))
    const strayBytes = stray.reduce((total, object) => total + object.size, 0)

    console.log(`\nBucket: ${objects.length} objects, ${stray.length} with no media row (${mb(strayBytes)})`)
    for (const object of stray.slice(0, 20)) console.log(`    ${object.name}`)
    if (stray.length > 20) console.log(`    … and ${stray.length - 20} more`)

    if (options.apply && stray.length) {
      // Exactly the objects listed, never names derived from them: a stray
      // original and a stray variant are both just objects here, and deriving
      // variant names from one could name a file whose row still exists.
      const storage = getStorageConfig()
      const keys = stray.map((object) => objectKey(MEDIA_PREFIX, object.name))
      for (let i = 0; i < keys.length; i += 100) {
        await deleteObjects(keys.slice(i, i + 100), storage)
      }
      console.log(`Deleted ${stray.length} stray object(s).`)
    } else if (stray.length) {
      console.log(`Nothing was changed. Re-run with --apply to delete these too.`)
    }
  }

  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
