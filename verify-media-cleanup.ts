/**
 * Throwaway end-to-end check for media cleanup. Deleted after use — see the
 * session notes; nothing in the app imports it.
 *
 * Runs against a scratch Postgres and a stub storage endpoint, both named by
 * env vars set on the command line (dotenv does not override those).
 */
import 'dotenv/config'
import http from 'node:http'
import sharp from 'sharp'
import { getPayload } from 'payload'
import config from './src/payload.config'

const deleteCalls: string[][] = []

// Payload fetches `url` when a document is created with one instead of a file,
// so the stub has to answer with something sharp will accept.
const pixel = await sharp({
  create: { width: 8, height: 8, channels: 3, background: { r: 1, g: 2, b: 3 } },
})
  .webp()
  .toBuffer()

const storage = http.createServer((req, res) => {
  let body = ''
  req.on('data', (chunk) => (body += chunk))
  req.on('end', () => {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'image/webp' })
      res.end(pixel)
      return
    }
    if (req.method === 'DELETE') {
      try {
        const parsed = JSON.parse(body || '{}')
        deleteCalls.push(parsed.prefixes ?? [req.url ?? ''])
      } catch {
        deleteCalls.push([req.url ?? ''])
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('[]')
  })
})
await new Promise<void>((resolve) => storage.listen(9099, resolve))

const payload = await getPayload({ config })

const results: Array<[string, boolean, string]> = []
const check = (label: string, pass: boolean, detail = '') => {
  results.push([label, pass, detail])
  console.log(`${pass ? '✓' : '✖'} ${label}${detail ? ` — ${detail}` : ''}`)
}

const makeMedia = async (name: string) =>
  (
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

const exists = async (id: number) => {
  try {
    await payload.findByID({ collection: 'media', id })
    return true
  } catch {
    return false
  }
}

// --- fixtures -------------------------------------------------------------
const user = await payload.create({
  collection: 'users',
  data: {
    email: `media-check-${Date.now()}@example.com`,
    password: 'test1234',
    name: 'Media',
    surname: 'Check',
    role: 'member',
    status: 'active',
  } as any,
})

const a = await makeMedia('slide-a')
const b = await makeMedia('slide-b')
const c = await makeMedia('profile-c')
const d = await makeMedia('block-d')
const e = await makeMedia('shared-e')

const member = await payload.create({
  collection: 'members',
  data: {
    user: user.id,
    company: 'Media Check Ltd',
    status: 'active',
    slideImages: [a, b],
    slideImage: a,
    profileImage: c,
  } as any,
})

// --- 1. a photo dropped from the sequence is deleted ----------------------
await payload.update({
  collection: 'members',
  id: member.id,
  data: { slideImages: [a], slideImage: a } as any,
})
check('photo dropped from the slide sequence is deleted', !(await exists(b)))
check('the photo that stayed is untouched', await exists(a))
check('the profile photo is untouched', await exists(c))

// --- 2. an upload used by another field survives --------------------------
await payload.update({
  collection: 'members',
  id: member.id,
  data: { profileImage: a } as any,
})
check('replaced profile photo is deleted', !(await exists(c)))

await payload.update({
  collection: 'members',
  id: member.id,
  data: { slideImages: [], slideImage: null } as any,
})
check(
  'a file still used by another field is kept when dropped from the slide',
  await exists(a),
  'slide cleared, but it is the profile photo',
)

// --- 3. slideshow custom-image blocks -------------------------------------
const slideshow = await payload.create({
  collection: 'slideshow-settings-collection',
  data: {
    internalTitle: 'Media check',
    slideSeconds: 60,
    slides: [{ blockType: 'customImage', image: d, displayMode: 'contain' }],
    transitionSound: e,
  } as any,
})

await payload.update({
  collection: 'slideshow-settings-collection',
  id: slideshow.id,
  data: { slides: [] } as any,
})
check('image on a deleted Custom Image slide is deleted', !(await exists(d)))
check('the transition sound is untouched', await exists(e))

// --- 4. deleting the owner takes its uploads ------------------------------
await payload.delete({ collection: 'members', id: member.id })
check('deleting a member deletes the uploads only it used', !(await exists(a)))

await payload.delete({ collection: 'slideshow-settings-collection', id: slideshow.id })
check('deleting a slideshow deletes its transition sound', !(await exists(e)))

// --- 5. the bucket lost the variants too ----------------------------------
const flat = deleteCalls.flat()
const wanted = ['media/slide-b.webp', 'media/slide-b-thumbnail.webp', 'media/slide-b-card.webp', 'media/slide-b-medium.webp']
check(
  'the original and all three sized variants are deleted from storage',
  wanted.every((key) => flat.includes(key)),
  `storage saw ${flat.length} keys, e.g. ${flat.slice(0, 4).join(', ')}`,
)

// --- 6. the sweep script's view -------------------------------------------
const { docs: leftovers } = await payload.find({ collection: 'media', limit: 100, depth: 0 })
check('nothing is left over in the media library', leftovers.length === 0, `${leftovers.length} rows remain`)

await payload.delete({ collection: 'users', id: user.id })

storage.close()
const failed = results.filter(([, pass]) => !pass)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
