/**
 * Generate the sized variants the imported library is missing.
 *
 *   node scripts/backfill-thumbnails.mjs [--apply]
 *
 * `getThumbnailUrl` derives a variant's address from the original's by suffix —
 * it never checks that the file is there. Any image whose `-thumbnail` was
 * never generated on the old CDN therefore renders as a broken image rather
 * than falling back, so the gaps have to be filled rather than tolerated.
 *
 * Sizes match `src/lib/generateMediaThumbnails.ts`; this is the same work that
 * hook does on upload, applied retroactively to files that arrived without it.
 */
import fs from 'node:fs'
import pg from 'pg'
import sharp from 'sharp'

const APPLY = process.argv.includes('--apply')

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

const SUPABASE_URL = env.SUPABASE_URL.replace(/\/+$/, '')
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = env.SUPABASE_STORAGE_BUCKET || 'media'
const PREFIX = 'media'

const SIZES = [
  { name: 'thumbnail', width: 200, height: 200 },
  { name: 'card', width: 400, height: 400 },
  { name: 'medium', width: 800, height: 800 },
]

const objectUrl = (name) =>
  `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${PREFIX}/${encodeURIComponent(name)}`

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

async function pool(items, worker, size) {
  const queue = [...items]
  await Promise.all(
    Array.from({ length: Math.min(size, queue.length) }, async () => {
      while (queue.length) await worker(queue.shift())
    }),
  )
}

async function main() {
  const db = new pg.Client({ connectionString: env.POSTGRESS_DATABASE_URL })
  await db.connect()
  const rows = (
    await db.query(
      `select id, filename, mime_type from media
       where mime_type like 'image/%' and mime_type not like '%svg%' order by id`,
    )
  ).rows
  await db.end()

  console.log(`Images: ${rows.length}`)
  console.log(APPLY ? 'Mode: APPLY\n' : 'Mode: dry run — nothing will be written\n')

  const stats = { generated: 0, present: 0, noOriginal: 0, failed: 0 }

  await pool(
    rows,
    async (row) => {
      const dot = row.filename.lastIndexOf('.')
      const stem = dot === -1 ? row.filename : row.filename.slice(0, dot)
      const ext = dot === -1 ? '' : row.filename.slice(dot)

      const missing = []
      await Promise.all(
        SIZES.map(async (s) => {
          const res = await fetch(objectUrl(`${stem}-${s.name}${ext}`), { method: 'HEAD' })
          if (res.ok) stats.present++
          else missing.push(s)
        }),
      )
      if (missing.length === 0) return

      const original = await fetch(objectUrl(row.filename))
      if (!original.ok) {
        stats.noOriginal++
        return
      }
      const buffer = Buffer.from(await original.arrayBuffer())

      for (const s of missing) {
        try {
          if (APPLY) {
            const resized = await sharp(buffer)
              .resize(s.width, s.height, { fit: 'inside', withoutEnlargement: true })
              .toBuffer()
            await upload(`${stem}-${s.name}${ext}`, resized, row.mime_type)
          }
          stats.generated++
        } catch (e) {
          stats.failed++
          console.log(`  FAILED ${stem}-${s.name}${ext}: ${e.message}`)
        }
      }
    },
    6,
  )

  console.log('--- summary ---')
  console.log(`  already present:      ${stats.present}`)
  console.log(`  ${APPLY ? 'generated' : 'would generate'}:  ${stats.generated}`)
  console.log(`  original missing:     ${stats.noOriginal}`)
  console.log(`  failed:               ${stats.failed}`)
  if (!APPLY) console.log('\nDry run. Re-run with --apply to generate.')
}

main().catch((e) => {
  console.error('BACKFILL FAILED:', e.message)
  process.exit(1)
})
