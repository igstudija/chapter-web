import sharp from 'sharp'
import type { Payload } from 'payload'
import {
  getStorageConfig,
  objectKey,
  publicUrl,
  splitFilename,
  uploadObject,
} from './storage'

/**
 * Upload an image plus its sized variants straight to storage and register the
 * original as a Media document.
 *
 * Used by import and scripted paths that already hold the bytes in memory and
 * would gain nothing from routing them back through Payload's upload endpoint.
 * Interactive uploads go through the Payload adapter instead.
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

/**
 * Reduce an arbitrary upload name to something safe as an object key.
 *
 * Keys are stored unencoded (see `objectKey`), so anything outside this set
 * would produce a key that does not round-trip through a URL.
 */
const sanitizeFilename = (filename: string): string => {
  let safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^_+/, '')
  // A name that reduced to nothing, or to a dotfile, gets a stem so the object
  // key is not empty or hidden.
  if (!safe || safe.startsWith('.')) safe = 'file_' + safe
  return safe
}

export async function uploadMediaWithSizes(
  payload: Payload,
  imageBuffer: Buffer,
  filename: string,
  mimeType: string,
  alt: string,
  siteId: number,
): Promise<number | null> {
  try {
    const config = getStorageConfig()
    const sanitizedFilename = sanitizeFilename(filename)

    await uploadObject(
      objectKey(MEDIA_PREFIX, sanitizedFilename),
      imageBuffer,
      mimeType,
      config,
    )
    const originalUrl = publicUrl(objectKey(MEDIA_PREFIX, sanitizedFilename), config)

    // Generate and upload sized variants (raster images only; SVG has no
    // meaningful raster size and sharp would rasterise it).
    let metadata: sharp.Metadata | undefined
    const isSvg = mimeType.includes('svg') || filename.toLowerCase().endsWith('.svg')

    if (mimeType.startsWith('image/') && !isSvg) {
      const image = sharp(imageBuffer)
      metadata = await image.metadata()

      // Variant names must derive from the SANITISED stem. `getThumbnailUrl`
      // rebuilds them from the stored filename, so deriving them from the raw
      // input name here would produce thumbnails nothing ever looks up.
      const { stem, ext } = splitFilename(sanitizedFilename)

      for (const size of IMAGE_SIZES) {
        try {
          const resized = await image
            .clone()
            .resize(size.width, size.height, {
              fit: 'inside', // Preserve aspect ratio, don't crop
              withoutEnlargement: true, // Don't upscale small images
            })
            .toBuffer()

          const sizeFilename = `${stem}-${size.name}${ext}`
          await uploadObject(objectKey(MEDIA_PREFIX, sizeFilename), resized, mimeType, config)
          console.log(`    Generated ${size.name}: ${sizeFilename}`)
        } catch (err) {
          // One failed size should not lose the original upload.
          console.error(
            `    Failed to generate ${size.name}:`,
            err instanceof Error ? err.message : err,
          )
        }
      }
    }

    // Only the original is recorded on the Media doc. Variants live in storage
    // under predictable `-thumbnail` / `-card` / `-medium` names and are resolved
    // by `getThumbnailUrl`, not stored per-document.
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: alt,
        site: siteId,
        url: originalUrl,
        filename: sanitizedFilename,
        mimeType: mimeType,
        filesize: imageBuffer.length,
        width: metadata?.width,
        height: metadata?.height,
      },
    })

    return media.id as number
  } catch (error) {
    console.error(`Error uploading ${filename}:`, error instanceof Error ? error.message : error)
    return null
  }
}
