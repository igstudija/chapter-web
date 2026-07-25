import type { CollectionConfig } from 'payload'
import { publishedOrAuthenticated } from '../access'
import { tinyEditor } from '../lib/tinyEditor'
import {
  siteScopedAdmin,
  siteFieldAccess,
  autoAssignSiteHook,
  siteBasedListFilter,
  createSiteScopedSlugValidation,
  filterUsersBySiteMemberships,
} from '../access/multisite'
import { hideOnSuperadminPanel } from '../access/adminVisibility'
import { getHostnameFromRequest, isSuperadminHost } from '../lib/hostname'
import { getSiteIdFromHostname } from '../access/multisite'
import slugify from 'slugify'
import { createSeoFields } from '../fields/seoFields'

export const Blog: CollectionConfig = {
  slug: 'blog',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', '_status'],
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
    beforeChange: [
      async (args) => autoAssignSiteHook(args),
      async ({ data, req, operation, originalDoc }) => {
        // Only generate slug if title exists and slug is empty
        if (data?.title && !data?.slug) {
          const baseSlug = slugify(data.title, { lower: true, strict: true })
          let slug = baseSlug
          let counter = 1

          // Get site ID for site-scoped uniqueness check
          let siteId = data?.site
          if (!siteId) {
            const hostname = getHostnameFromRequest(req)
            if (!isSuperadminHost(hostname)) {
              siteId = await getSiteIdFromHostname(hostname, req.payload)
            }
          }
          const siteIdValue = typeof siteId === 'object' ? siteId.id : siteId

          // Check for uniqueness within site only
          while (true) {
            const whereClause: any = {
              slug: { equals: slug },
            }
            // Add site filter if we have a site context
            if (siteIdValue) {
              whereClause.site = { equals: siteIdValue }
            }
            // Exclude current document on update
            if (operation === 'update' && originalDoc?.id) {
              whereClause.id = { not_equals: originalDoc.id }
            }

            const existing = await req.payload.find({
              collection: 'blog',
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
        description: 'The organisation this blog post belongs to',
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
      validate: createSiteScopedSlugValidation('blog'),
    },
    {
      name: 'excerpt',
      type: 'textarea',
      admin: {
        description: 'Short summary for listings',
      },
    },
    {
      name: 'content',
      type: 'richText',
      editor: tinyEditor(),
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      filterOptions: filterUsersBySiteMemberships,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    // SEO fields
    createSeoFields(),
  ],
}
