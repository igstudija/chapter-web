import { IS_SERVERLESS } from './runtime'

/**
 * Maximum accepted upload sizes.
 *
 * On a host you control the limits are about what is reasonable to store and
 * resize: a phone or DSLR original fits in 15MB, a recorded meeting in 50MB.
 *
 * Serverless platforms impose their own, much lower, cap on the *request body*
 * — 4.5MB on Vercel — and it is enforced by the platform's edge, before any of
 * this application's code runs. The user gets an opaque 413 with no message
 * from us. Defaulting below that cap on serverless means our own error fires
 * first and says something useful ("Maximum: 4 MB") instead. The margin covers
 * multipart overhead, which counts toward the platform's limit as well.
 *
 * Raise or lower either with MAX_IMAGE_UPLOAD_MB / MAX_AUDIO_UPLOAD_MB. Raising
 * them above a platform cap does not lift the cap — it only moves the failure
 * back to the opaque one.
 */
const mb = (value: number): number => value * 1024 * 1024

const fromEnv = (name: string, fallback: number): number => {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(`[Upload] ${name}="${raw}" is not a positive number; using ${fallback}MB`)
    return fallback
  }
  return parsed
}

export const MAX_IMAGE_BYTES = mb(fromEnv('MAX_IMAGE_UPLOAD_MB', IS_SERVERLESS ? 4 : 15))
export const MAX_AUDIO_BYTES = mb(fromEnv('MAX_AUDIO_UPLOAD_MB', IS_SERVERLESS ? 4 : 50))

/**
 * Hard backstop for *all* uploads, applied by Payload before the file is
 * buffered in memory. Per-type limits above are what produce a readable error;
 * this only has to be no lower than the largest of them.
 */
export const MAX_UPLOAD_BYTES = Math.max(MAX_IMAGE_BYTES, MAX_AUDIO_BYTES)
