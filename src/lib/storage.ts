/**
 * Object storage primitives, backed by Supabase Storage.
 *
 * Three separate code paths need to talk to storage: the Payload cloud-storage
 * adapter (`supabaseStorageAdapter.ts`), background thumbnail generation
 * (`generateMediaThumbnails.ts`), and direct multi-size uploads
 * (`uploadMediaWithSizes.ts`). They previously each carried their own copy of the
 * provider's HTTP details, which is how the three drifted apart. Everything
 * provider-specific now lives here, so swapping providers means rewriting this
 * one module.
 *
 * All calls use `fetch`, so there is no SDK dependency.
 *
 * Configuration (see .env.example):
 *   SUPABASE_URL                 project URL, e.g. https://abcdefgh.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    service-role key — server-side only, never NEXT_PUBLIC
 *   SUPABASE_STORAGE_BUCKET      public bucket name (default: media)
 */

export interface StorageConfig {
  baseUrl: string
  serviceRoleKey: string
  bucket: string
}

/**
 * Read and validate storage configuration.
 *
 * Throws naming the missing variables. Callers that must not fail hard (the
 * fire-and-forget thumbnail hook) should catch; the adapter lets it throw at
 * boot so misconfiguration surfaces on startup instead of on first upload.
 */
export const getStorageConfig = (): StorageConfig => {
  const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'media'

  const missing = [
    !baseUrl && 'SUPABASE_URL',
    !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean)

  if (missing.length) {
    throw new Error(
      `Object storage is not configured. Missing: ${missing.join(', ')}. ` +
        'See .env.example, and create the bucket as public in the Supabase dashboard.',
    )
  }

  return { baseUrl, serviceRoleKey, bucket }
}

const authHeaders = (config: StorageConfig): Record<string, string> => ({
  Authorization: `Bearer ${config.serviceRoleKey}`,
  apikey: config.serviceRoleKey,
})

/**
 * Join segments into an object key.
 *
 * Segments are deliberately NOT percent-encoded: Supabase treats `/` as a path
 * separator and stores the remainder of the key verbatim. Encoding here would
 * store keys containing literal `%20`, which then would not match the public
 * URLs built by `publicUrl`.
 */
export const objectKey = (...segments: Array<string | undefined>): string =>
  segments.filter(Boolean).join('/')

/** Browser-facing URL for an object in the public bucket. */
export const publicUrl = (key: string, config: StorageConfig = getStorageConfig()): string =>
  `${config.baseUrl}/storage/v1/object/public/${config.bucket}/${key}`

/** Upload (or overwrite) an object. */
export const uploadObject = async (
  key: string,
  buffer: Buffer,
  mimeType: string,
  config: StorageConfig = getStorageConfig(),
): Promise<void> => {
  const res = await fetch(`${config.baseUrl}/storage/v1/object/${config.bucket}/${key}`, {
    method: 'POST',
    headers: {
      ...authHeaders(config),
      'Content-Type': mimeType || 'application/octet-stream',
      // Resized variants are written under deterministic names and re-uploaded
      // whenever an image is reprocessed; without upsert the second write 409s.
      'x-upsert': 'true',
    },
    body: new Uint8Array(buffer),
  })

  if (!res.ok) {
    throw new Error(`Storage upload failed for ${key}: ${res.status} ${await res.text()}`)
  }
}

/** Delete an object. A missing object is not an error. */
export const deleteObject = async (
  key: string,
  config: StorageConfig = getStorageConfig(),
): Promise<void> => {
  const res = await fetch(`${config.baseUrl}/storage/v1/object/${config.bucket}/${key}`, {
    method: 'DELETE',
    headers: authHeaders(config),
  })

  // 404 means it is already gone. Treating that as success keeps a Media doc
  // whose file was removed out-of-band from being undeletable.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Storage delete failed for ${key}: ${res.status} ${await res.text()}`)
  }
}

/**
 * Delete many objects in one request.
 *
 * Keys that do not exist are simply absent from the response — the same
 * forgiving contract as `deleteObject`, which matters because sized variants
 * are derived by name and may never have been written (audio, SVG, an upload
 * whose thumbnail generation failed).
 */
export const deleteObjects = async (
  keys: string[],
  config: StorageConfig = getStorageConfig(),
): Promise<void> => {
  if (keys.length === 0) return

  const res = await fetch(`${config.baseUrl}/storage/v1/object/${config.bucket}`, {
    method: 'DELETE',
    headers: { ...authHeaders(config), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: keys }),
  })

  if (!res.ok && res.status !== 404) {
    throw new Error(`Storage delete failed for ${keys.length} keys: ${res.status} ${await res.text()}`)
  }
}

/** Whether an object exists. Network failures report false rather than throwing. */
export const objectExists = async (
  key: string,
  config: StorageConfig = getStorageConfig(),
): Promise<boolean> => {
  try {
    const res = await fetch(`${config.baseUrl}/storage/v1/object/${config.bucket}/${key}`, {
      method: 'HEAD',
      headers: authHeaders(config),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Fetch an object's bytes by its public URL. */
export const downloadFromUrl = async (url: string): Promise<Buffer> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

/**
 * Split a filename into stem and extension.
 *
 * Used to derive sized-variant names (`photo.jpg` → `photo-thumbnail.jpg`).
 * A name with no dot yields an empty extension rather than swallowing the stem.
 */
export const splitFilename = (filename: string): { stem: string; ext: string } => {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot <= 0) return { stem: filename, ext: '' }
  return { stem: filename.slice(0, lastDot), ext: filename.slice(lastDot) }
}

/** Hostname of the configured storage project, for next/image remotePatterns. */
export const storageHost = (): string | null => {
  try {
    return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : null
  } catch {
    return null
  }
}
