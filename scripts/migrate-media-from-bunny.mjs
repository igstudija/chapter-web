/**
 * Move the media library from the old Bunny pull zone into Supabase Storage.
 *
 *   node scripts/migrate-media-from-bunny.mjs [--apply] [--concurrency 8]
 *
 * Source is the pull zone in `.env.old` (public, so no Bunny credentials are
 * needed); target is the bucket in `.env`. Without `--apply` it only reports
 * what it finds.
 *
 * Why this is needed at all: the `url` column copied across still points at
 * Bunny, but nothing reads it. Payload's cloud-storage adapter regenerates the
 * URL from the bucket on every read, so the application is already asking
 * Supabase for these files — they just are not there yet.
 *
 * Sized variants matter as much as the originals. The old install wrote
 * `<stem>-thumbnail`, `-card` and `-medium` next to each image and the member
 * directory renders those, not the full-size file. Copying only what the `media`
 * table lists would leave every thumbnail broken, so each row is expanded into
 * its variants and each is fetched independently.
 *
 * Re-runnable: an object that already exists in the bucket is skipped, so an
 * interrupted run can simply be started again.
 */
import fs from 'node:fs'
import pg from 'pg'

const argv = process.argv.slice(2)
const APPLY = argv.includes('--apply')
const CONCURRENCY = Number(argv[argv.indexOf('--concurrency') + 1] || 8)

const readEnv = (file) =>
  Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
      }),
  )

const oldEnv = readEnv('.env.old')
const newEnv = readEnv('.env')

const PULL_ZONE = (oldEnv.BUNNY_PULL_ZONE || '').replace(/\/+$/, '')
const SUPABASE_URL = (newEnv.SUPABASE_URL || '').replace(/\/+$/, '')
const SERVICE_KEY = newEnv.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = newEnv.SUPABASE_STORAGE_BUCKET || 'media'
/** Matches the `prefix` the cloud-storage plugin is configured with. */
const PREFIX = 'media'

const SIZES = ['thumbnail', 'card', 'medium']

const splitFilename = (filename) => {
  const dot = filename.lastIndexOf('.')
  return dot === -1
    ? { stem: filename, ext: '' }
    : { stem: filename.slice(0, dot), ext: filename.slice(dot) }
}

/** Originals plus the sized variants the app expects to exist beside them. */
const candidatesFor = (filename, mimeType) => {
  const names = [filename]
  const isImage = (mimeType || '').startsWith('image/') && !(mimeType || '').includes('svg')
  if (isImage) {
    const { stem, ext } = splitFilename(filename)
    for (const size of SIZES) names.push(`${stem}-${size}${ext}`)
  }
  return names
}

const exists = async (name) => {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/info/public/${BUCKET}/${PREFIX}/${encodeURIComponent(name)}`,
    { method: 'HEAD' },
  )
  return res.ok
}

const download = async (name) => {
  const res = await fetch(`${PULL_ZONE}/${PREFIX}/${encodeURIComponent(name)}`)
  if (!res.ok) return null
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get('content-type') || 'application/octet-stream',
  }
}

const upload = async (name, buffer, contentType) => {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${PREFIX}/${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: buffer,
    },
  )
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`)
}

/** Run tasks with a bounded number in flight. */
async function pool(items, worker, size) {
  const queue = [...items]
  const runners = Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift())
  })
  await Promise.all(runners)
}

async function main() {
  if (!SERVICE_KEY || SERVICE_KEY.startsWith('placeholder')) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in .env')
  }

  const db = new pg.Client({ connectionString: newEnv.POSTGRESS_DATABASE_URL })
  await db.connect()
  const rows = (await db.query('select id, filename, mime_type from media order by id')).rows
  await db.end()

  const work = rows.flatMap((r) =>
    candidatesFor(r.filename, r.mime_type).map((name) => ({ name, original: r.filename })),
  )

  console.log(`Media rows: ${rows.length}`)
  console.log(`Files to look for (originals + variants): ${work.length}`)
  console.log(`Source: ${PULL_ZONE}/${PREFIX}/`)
  console.log(`Target: ${SUPABASE_URL}/storage/v1/object/${BUCKET}/${PREFIX}/`)
  console.log(APPLY ? 'Mode: APPLY\n' : 'Mode: dry run — nothing will be uploaded\n')

  const stats = { uploaded: 0, skipped: 0, missing: 0, failed: 0, bytes: 0 }
  const missing = []
  const failed = []
  let done = 0

  await pool(
    work,
    async (item) => {
      done++
      if (done % 250 === 0) process.stdout.write(`  ...${done}/${work.length}\n`)

      try {
        if (APPLY && (await exists(item.name))) {
          stats.skipped++
          return
        }
        const file = await download(item.name)
        if (!file) {
          stats.missing++
          missing.push(item.name)
          return
        }
        stats.bytes += file.buffer.length
        if (!APPLY) {
          stats.uploaded++
          return
        }
        await upload(item.name, file.buffer, file.contentType)
        stats.uploaded++
      } catch (e) {
        stats.failed++
        failed.push(`${item.name}: ${e.message}`)
      }
    },
    CONCURRENCY,
  )

  console.log('\n--- summary ---')
  console.log(`  ${APPLY ? 'uploaded' : 'would upload'}: ${stats.uploaded}`)
  console.log(`  already in bucket:  ${stats.skipped}`)
  console.log(`  not on Bunny:       ${stats.missing}`)
  console.log(`  failed:             ${stats.failed}`)
  console.log(`  transferred:        ${(stats.bytes / 1024 / 1024).toFixed(1)} MB`)

  // A missing variant is routine — not every image had every size generated.
  // A missing *original* means a media record with no file behind it.
  const originals = new Set(rows.map((r) => r.filename))
  const missingOriginals = missing.filter((m) => originals.has(m))
  if (missingOriginals.length) {
    console.log(`\n  originals with no file on Bunny (${missingOriginals.length}):`)
    for (const m of missingOriginals.slice(0, 20)) console.log(`    ${m}`)
    if (missingOriginals.length > 20) console.log(`    ... and ${missingOriginals.length - 20} more`)
  }
  if (failed.length) {
    console.log(`\n  failures (${failed.length}):`)
    for (const f of failed.slice(0, 20)) console.log(`    ${f}`)
  }
  if (!APPLY) console.log('\nDry run. Re-run with --apply to transfer.')
}

main().catch((e) => {
  console.error('MEDIA MIGRATION FAILED:', e.message)
  process.exit(1)
})
