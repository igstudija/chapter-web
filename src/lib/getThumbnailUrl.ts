/**
 * Generate thumbnail URL for images uploaded to object storage
 * Thumbnails are uploaded with -thumbnail, -card, -medium suffixes
 */

export type ThumbnailSize = 'thumbnail' | 'card' | 'medium'

/**
 * The square box each sized copy is fitted inside, in px. generateMediaThumbnails
 * resizes to these with `fit: 'inside'` and no enlargement, so a copy keeps the
 * original's proportions and its longer side is at most this long.
 */
export const THUMBNAIL_BOX: Readonly<Record<ThumbnailSize, number>> = {
  thumbnail: 200,
  card: 400,
  medium: 800,
}

export function getThumbnailUrl(
  originalUrl: string | undefined | null,
  size: ThumbnailSize = 'thumbnail',
): string | null {
  if (!originalUrl) return null

  // Extract filename and extension
  const lastSlash = originalUrl.lastIndexOf('/')
  const lastDot = originalUrl.lastIndexOf('.')

  if (lastSlash === -1 || lastDot === -1 || lastDot < lastSlash) {
    // Invalid URL or no extension
    return originalUrl
  }

  const baseUrl = originalUrl.substring(0, lastSlash + 1)
  const filename = originalUrl.substring(lastSlash + 1, lastDot)
  const extension = originalUrl.substring(lastDot)

  // For SVG files, return original (no thumbnails generated)
  if (extension.toLowerCase() === '.svg') {
    return originalUrl
  }

  // Generate thumbnail URL with suffix
  return `${baseUrl}${filename}-${size}${extension}`
}

/** A srcset candidate ends at whitespace, and a trailing comma is a separator. */
const srcSetUrl = (url: string) => url.replace(/\s/g, '%20').replace(/,/g, '%2C')

/**
 * A `srcset` built from the sized copies already sitting next to an original
 * in storage, so a browser on a small screen can take a smaller file.
 *
 * This is what `next/image` would generate if it optimised, without the paid
 * resizer: `images.unoptimized` is on everywhere (see next.config.mjs), and
 * with it set `next/image` drops any `srcSet` and ignores a `loader`. Render
 * the result on a plain `<img>`.
 *
 * Width descriptors come from the original's stored dimensions scaled the way
 * the thumbnail generator scales, so the browser knows each copy's real width.
 * Returns undefined when that cannot be worked out (no dimensions, SVG) or
 * when no requested copy is narrower than the original; use `src` alone then.
 */
export function getVariantSrcSet(
  media: {
    readonly url?: string | null
    readonly width?: number | null
    readonly height?: number | null
    readonly mimeType?: string | null
  },
  sizes: readonly ThumbnailSize[],
): string | undefined {
  const { url, width, height, mimeType } = media
  if (!url || !width || !height) return undefined
  if (mimeType?.includes('svg') || url.toLowerCase().endsWith('.svg')) return undefined

  const byWidth = new Map<number, string>()
  for (const size of sizes) {
    const box = THUMBNAIL_BOX[size]
    const variantWidth = Math.round(width * Math.min(box / width, box / height, 1))
    const variantUrl = getThumbnailUrl(url, size)
    if (variantWidth < width && variantUrl && !byWidth.has(variantWidth)) {
      byWidth.set(variantWidth, variantUrl)
    }
  }
  if (byWidth.size === 0) return undefined

  return [...byWidth.entries()]
    .sort(([a], [b]) => a - b)
    .map(([w, variantUrl]) => `${srcSetUrl(variantUrl)} ${w}w`)
    .concat(`${srcSetUrl(url)} ${width}w`)
    .join(', ')
}
