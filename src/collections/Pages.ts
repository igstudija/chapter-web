import type { CollectionConfig } from 'payload'
import { publishedOrAuthenticated } from '../access'
import { tinyEditor } from '../lib/tinyEditor'
import {
  siteScopedAdmin,
  siteFieldAccess,
  autoAssignSiteHook,
  siteBasedListFilter,
  createSiteScopedSlugValidation,
} from '../access/multisite'
import { hideOnSuperadminPanel } from '../access/adminVisibility'
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
    hidden: hideOnSuperadminPanel,
    baseListFilter: siteBasedListFilter,
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    read: publishedOrAuthenticated,
    create: siteScopedAdmin,
    update: siteScopedAdmin,
    delete: siteScopedAdmin,
  },
  versions: {
    drafts: true,
  },
  hooks: {
    beforeValidate: [
      async (args) => autoAssignSiteHook(args),
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
      name: 'site',
      type: 'relationship',
      relationTo: 'sites',
      required: false,
      hasMany: false,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'The organisation this page belongs to',
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
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
      validate: createSiteScopedSlugValidation('wiki'),
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
              relationTo: 'site-memberships',
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
