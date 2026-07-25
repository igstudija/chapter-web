import type { Adapter } from '@payloadcms/plugin-cloud-storage/types'
import {
  deleteObject,
  getStorageConfig,
  objectKey,
  publicUrl,
  uploadObject,
} from './storage'

/**
 * Payload cloud-storage adapter for Supabase Storage.
 *
 * All provider HTTP details live in `./storage`; this file only maps Payload's
 * adapter hooks onto them.
 *
 * Requires a **public** bucket. Payload is configured with
 * `disablePayloadAccessControl: true`, so `generateURL` hands the browser a
 * direct storage URL and media requests never pass back through the app — with a
 * private bucket every image would render broken rather than protected. Media
 * here is public content (member photos, event images, logos); anything
 * genuinely sensitive does not belong in the Media collection.
 *
 * Swapping providers is a single-file change: rewrite `./storage`.
 */

/**
 * Normalise whatever Payload hands us into a Buffer.
 *
 * Payload's upload pipeline passes different shapes depending on which route
 * produced the file — a Buffer from the REST API, a Blob or web ReadableStream
 * from a server action, a Node stream from the admin panel. Each branch below
 * covers one of those. Order matters: `arrayBuffer()` is tried before the reader
 * loop because it handles most stream types in a single call.
 */
const toBuffer = async (file: { buffer?: Buffer }, data: unknown): Promise<Buffer> => {
  if (file.buffer && Buffer.isBuffer(file.buffer)) return file.buffer
  if (Buffer.isBuffer(data)) return data
  if (data instanceof Uint8Array) return Buffer.from(data)

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return Buffer.from(await data.arrayBuffer())
  }

  const d = data as {
    getReader?: () => { read: () => Promise<{ done: boolean; value: Uint8Array }> }
    arrayBuffer?: () => Promise<ArrayBuffer>
    pipe?: unknown
    on?: (event: string, callback: (chunk: Buffer) => void) => void
  }

  if (typeof d?.arrayBuffer === 'function') {
    return Buffer.from(await d.arrayBuffer())
  }

  if (typeof d?.getReader === 'function') {
    const reader = d.getReader()
    const chunks: Uint8Array[] = []
    let result = await reader.read()
    while (!result.done) {
      chunks.push(result.value)
      result = await reader.read()
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)))
  }

  if (typeof d?.pipe === 'function' && typeof d?.on === 'function') {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      d.on!('data', (chunk: Buffer) => chunks.push(chunk))
      d.on!('end', () => resolve(Buffer.concat(chunks)))
      d.on!('error', reject)
    })
  }

  throw new Error(`Unsupported upload data type: ${typeof data}`)
}

export const supabaseStorageAdapter = (): Adapter => {
  // Validate at construction so a misconfigured install fails on boot with a
  // message naming the missing variable, not on the first upload attempt.
  const config = getStorageConfig()

  return (({ prefix }: { prefix?: string }) => ({
    name: 'supabase',

    generateURL: ({ filename }: { filename: string }) =>
      publicUrl(objectKey(prefix, filename), config),

    handleDelete: async ({ filename }: { filename: string }) =>
      deleteObject(objectKey(prefix, filename), config),

    handleUpload: async ({
      data,
      file,
    }: {
      data: unknown
      file: { filename: string; mimeType?: string; buffer?: Buffer }
    }) => {
      const buffer = await toBuffer(file, data)
      await uploadObject(
        objectKey(prefix, file.filename),
        buffer,
        file.mimeType || 'application/octet-stream',
        config,
      )
    },

    // Media is served straight from storage (disablePayloadAccessControl), so
    // the browser never hits this route for files.
    staticHandler: () => new Response('File not found', { status: 404 }),
  })) as Adapter
}
