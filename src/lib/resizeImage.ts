/**
 * Client-side image resizing utility using Canvas API
 * Resizes images before upload to reduce file size and improve performance
 */

export interface ResizeOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0-1 for JPEG/WebP
  format?: 'image/jpeg' | 'image/png' | 'image/webp'
}

const DEFAULT_OPTIONS: Required<ResizeOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  format: 'image/jpeg',
}

/**
 * Resize an image file on the client side
 * @param file - The original image file
 * @param options - Resize options (maxWidth, maxHeight, quality, format)
 * @returns Promise<File> - The resized image file
 */
export async function resizeImage(file: File, options: ResizeOptions = {}): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Skip if not an image
  if (!file.type.startsWith('image/')) {
    return file
  }

  // Skip SVG files - they don't need resizing
  if (file.type === 'image/svg+xml') {
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img
      const aspectRatio = width / height

      if (width > opts.maxWidth) {
        width = opts.maxWidth
        height = Math.round(width / aspectRatio)
      }

      if (height > opts.maxHeight) {
        height = opts.maxHeight
        width = Math.round(height * aspectRatio)
      }

      // If image is already small enough and is JPEG/WebP, return original
      if (
        width === img.width &&
        height === img.height &&
        (file.type === 'image/jpeg' || file.type === 'image/webp')
      ) {
        resolve(file)
        return
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      // Use better quality scaling
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'))
            return
          }

          // Determine file extension based on format
          const ext = opts.format === 'image/png' ? '.png' : opts.format === 'image/webp' ? '.webp' : '.jpg'
          const baseName = file.name.replace(/\.[^/.]+$/, '')
          const newFileName = `${baseName}${ext}`

          // Create new File from blob
          const resizedFile = new File([blob], newFileName, {
            type: opts.format,
            lastModified: Date.now(),
          })

          resolve(resizedFile)
        },
        opts.format,
        opts.quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Preset configurations for different use cases
 */
export const resizePresets = {
  // For profile photos - smaller size
  profile: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.85,
    format: 'image/jpeg' as const,
  },
  // For logos - maintain quality
  logo: {
    maxWidth: 600,
    maxHeight: 400,
    quality: 0.9,
    format: 'image/png' as const,
  },
  // For gallery images - balanced
  gallery: {
    maxWidth: 1600,
    maxHeight: 1200,
    quality: 0.85,
    format: 'image/jpeg' as const,
  },
  // For hero/banner images - larger
  hero: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85,
    format: 'image/jpeg' as const,
  },
}
