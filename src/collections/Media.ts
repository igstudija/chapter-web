import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { hideOnSuperadminPanel } from '../access/adminVisibility'
import {
  siteField,
  autoAssignSiteHook,
  siteScopedAdmin,
  siteScopedActiveMember,
  siteBasedListFilter,
} from '../access/multisite'
import { generateMediaThumbnails } from '../lib/generateMediaThumbnails'

const MAX_IMAGE_BYTES = 15 * 1024 * 1024 // 15MB — phone/DSLR originals fit; anything bigger is rejected
const MAX_AUDIO_BYTES = 50 * 1024 * 1024 // 50MB

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    hidden: hideOnSuperadminPanel,
    baseListFilter: siteBasedListFilter,
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    read: () => true, // Media needs to be publicly readable for frontend
    create: siteScopedActiveMember,
    update: siteScopedActiveMember,
    delete: siteScopedAdmin,
  },
  hooks: {
    beforeOperation: [
      async ({ operation, req }) => {
        if (operation !== 'create' && operation !== 'update') return
        const file = req.file
        if (!file) return
        const isImage = file.mimetype?.startsWith('image/')
        const limit = isImage ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES
        if (file.size > limit) {
          const sizeMb = (file.size / 1024 / 1024).toFixed(1)
          const limitMb = Math.round(limit / 1024 / 1024)
          throw new APIError(
            `Fails pārāk liels (${sizeMb} MB). Maksimālais izmērs: ${limitMb} MB. / File too large (${sizeMb} MB). Maximum: ${limitMb} MB.`,
            400,
          )
        }
      },
    ],
    beforeValidate: [
      async (args) => autoAssignSiteHook(args),
      async ({ data, req }) => {
        if (!data?.filename) return data
        const lastDot = data.filename.lastIndexOf('.')
        if (lastDot === -1) return data
        const name = data.filename.substring(0, lastDot)
        const ext = data.filename.substring(lastDot)
        const sanitized =
          name
            .toLowerCase()
            .replaceAll(/[^a-z0-9āčēģīķļņšūž_-]/g, '-')
            .replaceAll(/-+/g, '-')
            .replaceAll(/(^-|-$)/g, '') + ext.toLowerCase()

        // Ensure filename is unique by appending a counter if needed
        let candidate = sanitized
        let counter = 1
        while (true) {
          const existing = await req.payload.find({
            collection: 'media',
            where: { filename: { equals: candidate } },
            limit: 1,
            depth: 0,
          })
          if (existing.docs.length === 0) break
          const baseName = sanitized.substring(0, sanitized.lastIndexOf('.'))
          const baseExt = sanitized.substring(sanitized.lastIndexOf('.'))
          candidate = `${baseName}-${counter}${baseExt}`
          counter++
        }

        data.filename = candidate
        return data
      },
    ],
    afterChange: [generateMediaThumbnails],
  },
  fields: [
    // Site field - auto-assigned, hidden from non-superadmin
    siteField({ required: false }), // Optional for backwards compatibility with existing media
    {
      name: 'alt',
      type: 'text',
    },
  ],
  upload: {
    disableLocalStorage: true,
    mimeTypes: ['image/*', 'audio/*'],
    // Note: Payload's `imageSizes` don't work alongside a cloud-storage adapter
    // with disableLocalStorage. Sized variants are produced by
    // generateMediaThumbnails under -thumbnail/-card/-medium suffixes; read them
    // via getThumbnailUrl. Storage serves files verbatim — there is no
    // provider-side resizer, so ?width=/?height= query params do nothing and
    // would silently return the full-size original. Don't reach for them.
    //
    // Admin-panel uploads arrive as raw originals (frontend forms already
    // compress in the browser via resizeImage.ts). These options make Payload
    // process the file ONCE at upload time, so only a web-friendly WebP ever
    // reaches storage. Applied to images only — audio and SVG pass through.
    resizeOptions: {
      width: 1920,
      height: 1920,
      fit: 'inside',
      withoutEnlargement: true,
    },
    formatOptions: {
      format: 'webp',
      options: { quality: 82 },
    },
  },
}
