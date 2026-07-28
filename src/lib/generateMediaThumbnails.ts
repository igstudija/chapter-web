import sharp from 'sharp'
import type { CollectionAfterChangeHook } from 'payload'
import {
  downloadFromUrl,
  getStorageConfig,
  objectExists,
  objectKey,
  splitFilename,
  uploadObject,
} from './storage'
import { IS_SERVERLESS } from './runtime'

/**
 * Background thumbnail generation for uploaded images.
 *
 * Payload's built-in `imageSizes` do not work alongside a cloud-storage adapter
 * with `disableLocalStorage`, so sized variants are produced here and written
 * next to the original under `<stem>-<size><ext>`. Read them back with
 * `getThumbnailUrl`.
 */

interface ImageSize {
  name: string
  width: number
  height: number
}

const IMAGE_SIZES: ImageSize[] = [
  { name: 'thumbnail', width: 200, height: 200 },
  { name: 'card', width: 400, height: 400 },
  { name: 'medium', width: 800, height: 800 },
]

const MEDIA_PREFIX = 'media'

// Runs after the afterChange hook returns. Resizes and uploads in parallel so
// total wall time ≈ slowest single upload, not the sum of all three.
const processThumbnails = async (doc: any): Promise<void> => {
  const config = getStorageConfig()

  const urlParts = doc.url.split('/')
  const originalFilename = decodeURIComponent(urlParts[urlParts.length - 1])
  const { stem, ext } = splitFilename(originalFilename)

  // The smallest thumbnail doubles as a sentinel for the whole set: if it
  // exists, this image was already processed and there is nothing to redo.
  const sentinelKey = objectKey(MEDIA_PREFIX, `${stem}-thumbnail${ext}`)
  if (await objectExists(sentinelKey, config)) {
    return
  }

  const imageBuffer = await downloadFromUrl(doc.url)
  const image = sharp(imageBuffer)

  await Promise.all(
    IMAGE_SIZES.map(async (size) => {
      try {
        const resized = await image
          .clone()
          .resize(size.width, size.height, { fit: 'inside', withoutEnlargement: true })
          .toBuffer()

        await uploadObject(
          objectKey(MEDIA_PREFIX, `${stem}-${size.name}${ext}`),
          resized,
          doc.mimeType,
          config,
        )
      } catch (err) {
        // One failed size should not abort the others.
        console.error(
          `[Media] Failed to generate ${size.name} for ${originalFilename}:`,
          err instanceof Error ? err.message : err,
        )
      }
    }),
  )
}

export const generateMediaThumbnails: CollectionAfterChangeHook = async ({ doc, operation }) => {
  if (operation !== 'create' && operation !== 'update') return doc
  if (!doc.mimeType?.startsWith('image/') || doc.mimeType.includes('svg')) return doc
  if (!doc.url) return doc
  if (process.env.DISABLE_THUMBNAIL_GENERATION === '1') return doc

  const work = () =>
    processThumbnails(doc).catch((error) => {
      console.error(
        `[Media] Background thumbnail generation failed:`,
        error instanceof Error ? error.message : error,
      )
    })

  // Long-running host: fire-and-forget. The storage round-trips would otherwise
  // add 2-10s to every media save, so the hook resolves immediately and
  // thumbnails materialise in the background.
  if (!IS_SERVERLESS) {
    void work()
    return doc
  }

  // Serverless: the instance is frozen the moment the response is sent, so a
  // detached promise is not "backgrounded" — it is abandoned, usually part-way
  // through, leaving some sizes uploaded and some missing. `after()` keeps the
  // invocation billable and alive until the work settles.
  const promise = work()
  try {
    const { after } = await import('next/server')
    after(promise)
  } catch {
    // No request scope to attach to — a script, a seed, a cron entrypoint.
    // Waiting is slower than the admin panel would like but it is the only
    // way the thumbnails actually get written.
    await promise
  }

  return doc
}
