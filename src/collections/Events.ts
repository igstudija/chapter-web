import type { CollectionConfig } from 'payload'
import { adminOnly, createUniqueSlugValidation } from '../access'

import { tinyEditor } from '../lib/tinyEditor'
import slugify from 'slugify'
import { createSeoFields } from '../fields/seoFields'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'location', '_status'],
    group: 'Content',
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
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  versions: {
    drafts: true,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        if (data?.title && !data?.slug) {
          const baseSlug = slugify(data.title, { lower: true, strict: true })
          let slug = baseSlug
          let counter = 1

          while (true) {
            const whereClause: any = {
              slug: { equals: slug },
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
      validate: createUniqueSlugValidation('events'),
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
