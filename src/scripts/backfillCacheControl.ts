import 'dotenv/config'
import { getStorageConfig, OBJECT_MAX_AGE_SECONDS, publicUrl } from '../lib/storage'

/**
 * Give objects uploaded before cache-control was set the same header new
 * uploads get.
 *
 * Supabase stores Cache-Control with the object and has no metadata-only
 * update, so each object that answers `no-cache` is downloaded from its public
 * URL and written back in place with the header. Content and key are
 * unchanged, so every URL keeps working.
 *
 *   pnpm media:cache-headers           list what would change
 *   pnpm media:cache-headers --apply   change it
 */

const apply = process.argv.includes('--apply')
const config = getStorageConfig()
const auth = { Authorization: `Bearer ${config.serviceRoleKey}`, apikey: config.serviceRoleKey }

interface ListedObject {
  name: string
  id: string | null
  metadata: { cacheControl?: string; mimetype?: string } | null
}

/** Every object key under `prefix`, walking folders (which list with id null). */
async function listAll(prefix = ''): Promise<ListedObject[]> {
  const out: ListedObject[] = []
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${config.baseUrl}/storage/v1/object/list/${config.bucket}`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }),
    })
    if (!res.ok) throw new Error(`list ${prefix}: ${res.status} ${await res.text()}`)
    const page = (await res.json()) as ListedObject[]
    for (const item of page) {
      const key = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) out.push(...(await listAll(key)))
      else out.push({ ...item, name: key })
    }
    if (page.length < 1000) return out
  }
}

async function main() {
  const wanted = `max-age=${OBJECT_MAX_AGE_SECONDS}`
  const objects = await listAll()
  const stale = objects.filter((o) => o.metadata?.cacheControl !== wanted)
  console.log(`${objects.length} objects, ${stale.length} without "${wanted}".`)
  if (!apply) {
    for (const o of stale.slice(0, 20)) console.log(`  ${o.name} (${o.metadata?.cacheControl ?? 'none'})`)
    if (stale.length > 20) console.log(`  … and ${stale.length - 20} more`)
    console.log('Dry run. Re-run with --apply to rewrite them.')
    return
  }

  let done = 0
  for (const o of stale) {
    const download = await fetch(publicUrl(o.name, config))
    if (!download.ok) {
      console.warn(`skip ${o.name}: download ${download.status}`)
      continue
    }
    const body = new Uint8Array(await download.arrayBuffer())
    const res = await fetch(`${config.baseUrl}/storage/v1/object/${config.bucket}/${o.name}`, {
      method: 'PUT',
      headers: {
        ...auth,
        'Content-Type': o.metadata?.mimetype || download.headers.get('content-type') || 'application/octet-stream',
        'cache-control': wanted,
        'x-upsert': 'true',
      },
      body,
    })
    if (!res.ok) {
      console.warn(`fail ${o.name}: ${res.status} ${await res.text()}`)
      continue
    }
    done++
    if (done % 25 === 0) console.log(`  ${done}/${stale.length}`)
  }
  console.log(`Rewrote ${done} of ${stale.length}.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
