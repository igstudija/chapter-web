/**
 * Throwaway check for `pnpm clean:media`. Deleted after use.
 *
 * Seeds a library with a referenced upload, an orphan, an upload that only an
 * *older version row* still points at, and a bucket object with no row at all,
 * then runs the sweep as a child process and asserts on what survived.
 */
import 'dotenv/config'
import http from 'node:http'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'
import { getPayload } from 'payload'
import config from './src/payload.config'

const STRAY = 'ghost-no-row.webp'
const stored = new Set<string>([STRAY])
const deleted: string[] = []

const pixel = await sharp({
  create: { width: 8, height: 8, channels: 3, background: { r: 1, g: 2, b: 3 } },
})
  .webp()
  .toBuffer()

const storage = http.createServer((req, res) => {
  let body = ''
  req.on('data', (chunk) => (body += chunk))
  req.on('end', () => {
    const url = req.url ?? ''

    if (req.method === 'POST' && url.includes('/object/list/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify([...stored].map((name) => ({ name, metadata: { size: 100 } }))),
      )
      return
    }
    if (req.method === 'POST') {
      stored.add(decodeURIComponent(url.split('/media/').pop() || ''))
      res.writeHead(200)
      res.end('{}')
      return
    }
    if (req.method === 'DELETE') {
      const keys: string[] = JSON.parse(body || '{}').prefixes ?? []
      for (const key of keys) {
        const name = key.replace(/^media\//, '')
        deleted.push(name)
        stored.delete(name)
      }
      res.writeHead(200)
      res.end('[]')
      return
    }
    res.writeHead(200, { 'Content-Type': 'image/webp' })
    res.end(pixel)
  })
})
await new Promise<void>((resolve) => storage.listen(9099, resolve))

const payload = await getPayload({ config })

const makeMedia = async (name: string) => {
  stored.add(`${name}.webp`)
  return (
    await payload.create({
      collection: 'media',
      data: {
        alt: name,
        url: `http://localhost:9099/storage/v1/object/public/media/media/${name}.webp`,
        filename: `${name}.webp`,
        mimeType: 'image/webp',
        filesize: 100,
        width: 10,
        height: 10,
      } as any,
    })
  ).id as number
}

const used = await makeMedia('sweep-used')
const orphan = await makeMedia('sweep-orphan')
const oldVersion = await makeMedia('sweep-old-version')

const user = await payload.create({
  collection: 'users',
  data: {
    email: `sweep-${Date.now()}@example.com`,
    password: 'test1234',
    name: 'Sweep',
    surname: 'Check',
    role: 'member',
    status: 'active',
  } as any,
})
await payload.create({
  collection: 'members',
  data: { user: user.id, company: 'Sweep Ltd', status: 'active', profileImage: used } as any,
})

// A published post that used `oldVersion`, then republished without it. The
// current row no longer points at the file; the version row still does.
const post = await payload.create({
  collection: 'blog',
  data: {
    title: 'Sweep check',
    slug: `sweep-check-${Date.now()}`,
    featuredImage: oldVersion,
    _status: 'published',
  } as any,
})
await payload.update({
  collection: 'blog',
  id: post.id,
  data: { featuredImage: null, _status: 'published' } as any,
})

console.log(`\nseeded: used=${used} orphan=${orphan} oldVersion=${oldVersion}\n`)

const run = (args: string[]) =>
  spawnSync('pnpm', ['exec', 'tsx', 'src/scripts/cleanMedia.ts', ...args], {
    encoding: 'utf8',
    env: process.env,
  }).stdout

console.log('--- dry run ---')
const dry = run(['--min-age-hours', '0'])
console.log(dry)

console.log('--- apply ---')
console.log(run(['--apply', '--min-age-hours', '0', '--prune-storage']))

const exists = async (id: number) => {
  try {
    await payload.findByID({ collection: 'media', id })
    return true
  } catch {
    return false
  }
}

const results: Array<[string, boolean, string]> = []
const check = (label: string, pass: boolean, detail = '') => {
  results.push([label, pass, detail])
  console.log(`${pass ? '✓' : '✖'} ${label}${detail ? ` — ${detail}` : ''}`)
}

check('the dry run changed nothing', dry.includes('Nothing was changed'))
check('an upload nothing points at is deleted', !(await exists(orphan)))
check('an upload in use survives', await exists(used))
check(
  'an upload only an older version row points at survives',
  await exists(oldVersion),
  'foreign keys see version tables; a config query would not',
)
check(
  'the orphan took its sized variants with it',
  ['sweep-orphan.webp', 'sweep-orphan-thumbnail.webp', 'sweep-orphan-card.webp', 'sweep-orphan-medium.webp'].every(
    (name) => deleted.includes(name),
  ),
  `deleted: ${deleted.join(', ')}`,
)
check('a bucket object with no row is pruned', deleted.includes(STRAY))
check('files belonging to a surviving row are left alone', !deleted.includes('sweep-used.webp'))

storage.close()
const failed = results.filter(([, pass]) => !pass)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
