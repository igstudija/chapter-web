/**
 * Generate thumbnail URL for images uploaded to object storage
 * Thumbnails are uploaded with -thumbnail, -card, -medium suffixes
 */

export type ThumbnailSize = 'thumbnail' | 'card' | 'medium'

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
