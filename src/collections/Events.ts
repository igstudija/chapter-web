import type { CollectionConfig } from 'payload'

import { tinyEditor } from '../lib/tinyEditor'
import {
  siteScopedAdmin,
  siteFieldAccess,
  autoAssignSiteHook,
  siteBasedListFilter,
  createSiteScopedSlugValidation,
  getSiteIdFromHostname,
} from '../access/multisite'
import { hideOnSuperadminPanel } from '../access/adminVisibility'
import { getHostnameFromRequest, isSuperadminHost } from '../lib/hostname'
import slugify from 'slugify'
import { createSeoFields } from '../fields/seoFields'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'location', '_status'],
    group: 'Content',
    hidden: hideOnSuperadminPanel,
    baseListFilter: siteBasedListFilter,
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    read: ({ req: { user } }) => {
      if (user) return true
      return {
        _status: { equals: 'published' },
        isPublic: { equals: true },
      }
    },
    create: siteScopedAdmin,
    update: siteScopedAdmin,
    delete: siteScopedAdmin,
  },
  versions: {
    drafts: true,
  },
  hooks: {
    beforeChange: [
      async (args) => autoAssignSiteHook(args),
      async ({ data, req, operation, originalDoc }) => {
        if (data?.title && !data?.slug) {
          const baseSlug = slugify(data.title, { lower: true, strict: true })
          let slug = baseSlug
          let counter = 1

          let siteId = data?.site
          if (!siteId) {
            const hostname = getHostnameFromRequest(req)
            if (!isSuperadminHost(hostname)) {
              siteId = await getSiteIdFromHostname(hostname, req.payload)
            }
          }
          const siteIdValue = typeof siteId === 'object' ? siteId.id : siteId

          while (true) {
            const whereClause: any = {
              slug: { equals: slug },
            }
            if (siteIdValue) {
              whereClause.site = { equals: siteIdValue }
            }
            if (operation === 'update' && originalDoc?.id) {
              whereClause.id = { not_equals: originalDoc.id }
            }

            const existing = await req.payload.find({
              collection: 'events',
              where: whereClause,
              limit: 1,
              depth: 0,
            })

            if (existing.totalDocs === 0) {
              break
            }

            counter++
            slug = `${baseSlug}-${counter}`
          }

          data.slug = slug
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'site',
      type: 'relationship',
      relationTo: 'sites',
      required: false,
      hasMany: false,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'The organisation this event belongs to',
        condition: (data, siblingData, { user }) => user?.isSuperadmin === true,
      },
      access: {
        update: siteFieldAccess,
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
      },
      validate: createSiteScopedSlugValidation('events'),
    },
    {
      type: 'row',
      fields: [
        {
          name: 'date',
          type: 'date',
          required: true,
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'endDate',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
      ],
    },
    {
      name: 'location',
      type: 'text',
    },
    {
      name: 'description',
      type: 'richText',
      editor: tinyEditor(),
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'If unchecked, only members can see this event',
        position: 'sidebar',
      },
    },
    // SEO fields
    createSeoFields(),
  ],
}
