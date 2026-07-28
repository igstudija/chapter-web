import { deleteObjects, getStorageConfig, objectKey, splitFilename, type StorageConfig } from './storage'

/**
 * The sized variants that live next to every uploaded image.
 *
 * Payload's own `imageSizes` do not work alongside a cloud-storage adapter with
 * `disableLocalStorage`, so variants are written by hand under
 * `<stem>-<size><ext>` and resolved by name rather than recorded on the Media
 * document. Nothing in the database points at them, which is exactly why the
 * list has to be shared: a writer that knows about three sizes and a deleter
 * that knows about two leaves files in the bucket that no code can ever find
 * again.
 *
 * Written by `generateMediaThumbnails` (interactive uploads) and
 * `uploadMediaWithSizes` (scripted imports); removed by `deleteMediaFiles`.
 */

export interface ImageSize {
  name: string
  width: number
  height: number
}

export const IMAGE_SIZES: ImageSize[] = [
  { name: 'thumbnail', width: 200, height: 200 },
  { name: 'card', width: 400, height: 400 },
  { name: 'medium', width: 800, height: 800 },
]

/** Bucket folder every Media file is stored under. Matches the cloud-storage plugin's `prefix`. */
export const MEDIA_PREFIX = 'media'

/** The variant filenames derived from an original: `photo.jpg` → `photo-thumbnail.jpg`, … */
export const variantFilenames = (filename: string): string[] => {
  const { stem, ext } = splitFilename(filename)
  return IMAGE_SIZES.map((size) => `${stem}-${size.name}${ext}`)
}

/** An original and every variant name derived from it. */
export const mediaFilenames = (filename: string): string[] => [
  filename,
  ...variantFilenames(filename),
]

/**
 * Remove an upload's original *and* its sized variants from the bucket.
 *
 * Deleting only the original is the difference between a media library that
 * shrinks when you empty it and one that keeps three quarters of its bytes
 * forever: the variants outnumber originals three to one and no longer have a
 * database row naming them once the original is gone.
 *
 * Variants are attempted for every file, including audio and SVG which never
 * had any. A key that was never written costs nothing to name — it is simply
 * absent from the response — and guessing which uploads have variants is how
 * the two lists drift apart again.
 */
export const deleteMediaFiles = async (
  filename: string,
  prefix: string | undefined = MEDIA_PREFIX,
  config: StorageConfig = getStorageConfig(),
): Promise<void> => {
  await deleteObjects(
    mediaFilenames(filename).map((name) => objectKey(prefix, name)),
    config,
  )
}
