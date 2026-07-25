import type { CollectionConfig } from 'payload'
import { adminOnly, createUniqueSlugValidation, publishedOrAuthenticated } from '../access'
import { tinyEditor } from '../lib/tinyEditor'
import { createSeoFields } from '../fields/seoFields'

const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

export const Wiki: CollectionConfig = {
  slug: 'wiki',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status'],
    group: 'Content',
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    read: publishedOrAuthenticated,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  versions: {
    drafts: true,
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (data?.title && (!data?.slug || operation === 'create')) {
          data.slug = slugify(data.title)
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
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
      validate: createUniqueSlugValidation('wiki'),
    },
    {
      name: 'content',
      type: 'richText',
      editor: tinyEditor(),
    },
    {
      name: 'layout',
      type: 'blocks',
      blocks: [
        {
          slug: 'hero',
          fields: [
            {
              name: 'heading',
              type: 'text',
              required: true,
            },
            {
              name: 'subheading',
              type: 'text',
            },
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
            },
          ],
        },
        {
          slug: 'content-section',
          fields: [
            {
              name: 'content',
              type: 'richText',
              editor: tinyEditor(),
            },
          ],
        },
        {
          slug: 'team-grid',
          fields: [
            {
              name: 'heading',
              type: 'text',
            },
            {
              name: 'members',
              type: 'relationship',
              relationTo: 'members',
              hasMany: true,
            },
          ],
        },
        {
          slug: 'faq',
          fields: [
            {
              name: 'heading',
              type: 'text',
            },
            {
              name: 'items',
              type: 'array',
              fields: [
                {
                  name: 'question',
                  type: 'text',
                  required: true,
                },
                {
                  name: 'answer',
                  type: 'richText',
                  required: true,
                  editor: tinyEditor(),
                },
              ],
            },
          ],
        },
        {
          slug: 'contact-info',
          fields: [
            {
              name: 'heading',
              type: 'text',
            },
            {
              name: 'email',
              type: 'email',
            },
            {
              name: 'phone',
              type: 'text',
            },
            {
              name: 'address',
              type: 'textarea',
            },
          ],
        },
      ],
    },
    // SEO fields (replaces old meta group)
    createSeoFields(),
  ],
}
