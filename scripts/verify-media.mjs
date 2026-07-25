/**
 * Check that the media library actually resolves from Supabase Storage.
 *
 *   node scripts/verify-media.mjs [--sample 120]
 *
 * The database stores a `url`, but the application never reads it — the
 * cloud-storage adapter regenerates the URL from the bucket on every read. So
 * the only question that matters is whether the object exists at the key the
 * adapter computes, which is what this requests.
 *
 * Thumbnails are checked alongside originals because the member directory
 * renders `-thumbnail`, not the full-size file: an install where every original
 * uploaded cleanly and every thumbnail is missing still looks broken.
 */
import fs from 'node:fs'
import pg from 'pg'

const argv = process.argv.slice(2)
const SAMPLE = Number(argv[argv.indexOf('--sample') + 1] || 120)

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const BASE = env.SUPABASE_URL.replace(/\/+$/, '')
const BUCKET = env.SUPABASE_STORAGE_BUCKET || 'media'
const PREFIX = 'media'

const publicUrl = (name) =>
  `${BASE}/storage/v1/object/public/${BUCKET}/${PREFIX}/${encodeURIComponent(name)}`

const main = async () => {
  const db = new pg.Client({ connectionString: env.POSTGRESS_DATABASE_URL })
  await db.connect()
  const rows = (
    await db.query(
      `select filename, mime_type from media
       where mime_type like 'image/%' and mime_type not like '%svg%'
       order by random() limit $1`,
      [SAMPLE],
    )
  ).rows
  await db.end()

  let okOriginal = 0
  let okThumb = 0
  const broken = []

  await Promise.all(
    rows.map(async (r) => {
      const dot = r.filename.lastIndexOf('.')
      const stem = dot === -1 ? r.filename : r.filename.slice(0, dot)
      const ext = dot === -1 ? '' : r.filename.slice(dot)

      const [o, t] = await Promise.all([
        fetch(publicUrl(r.filename), { method: 'HEAD' }),
        fetch(publicUrl(`${stem}-thumbnail${ext}`), { method: 'HEAD' }),
      ])
      if (o.ok) okOriginal++
      else broken.push(`original ${r.filename} → ${o.status}`)
      if (t.ok) okThumb++
      else broken.push(`thumbnail ${stem}-thumbnail${ext} → ${t.status}`)
    }),
  )

  console.log(`Sampled ${rows.length} images`)
  console.log(`  originals reachable:  ${okOriginal}/${rows.length}`)
  console.log(`  thumbnails reachable: ${okThumb}/${rows.length}`)
  if (broken.length) {
    console.log(`\n  ${broken.length} not reachable:`)
    for (const b of broken.slice(0, 25)) console.log(`    ${b}`)
    if (broken.length > 25) console.log(`    ... and ${broken.length - 25} more`)
  }
}

main().catch((e) => {
  console.error('VERIFY FAILED:', e.message)
  process.exit(1)
})
