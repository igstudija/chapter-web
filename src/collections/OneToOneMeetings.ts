import type { CollectionConfig, Where } from 'payload'
import { activeMember } from '../access'
import {
  isUserSuperadmin,
  createSiteScopedAdminOrOwner,
  siteFieldAccess,
  autoAssignSiteHook,
  siteBasedListFilter,
  getSiteIdFromHostname,
  filterUsersBySiteMemberships,
} from '../access/multisite'
import { hideActivitiesCollection } from '../access/adminVisibility'
import { getHostnameFromRequest } from '../lib/hostname'

/**
 * OneToOneMeetings Collection
 *
 * SECURITY: All site detection is hostname-based only.
 * No JWT fallback to prevent cross-site data access.
 */
export const OneToOneMeetings: CollectionConfig = {
  slug: 'one-to-one-meetings',
  admin: {
    useAsTitle: 'location',
    defaultColumns: ['location', 'date', 'createdAt'],
    group: 'Internal',
    hidden: hideActivitiesCollection,
    baseListFilter: siteBasedListFilter,
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    // Site-scoped read access - hostname only, no JWT fallback
    read: async ({ req }) => {
      const { user } = req
      if (!user) return false
      if (isUserSuperadmin(user)) return true
      if (!req.payload) return false

      // SECURITY: Always use hostname for site detection
      const hostname = getHostnameFromRequest(req)
      const siteId = await getSiteIdFromHostname(hostname, req.payload)

      // No site context = no access (don't fall back to JWT)
      if (!siteId) return false

      // Check user's role in this site via membership
      const memberships = await req.payload.find({
        collection: 'site-memberships',
        where: {
          and: [{ user: { equals: user.id } }, { site: { equals: siteId } }],
        },
        limit: 1,
      })

      const membership = memberships.docs[0]
      if (!membership) return false

      // Admin can see all meetings in their site
      if (membership.role === 'member-admin') {
        return { site: { equals: siteId } } as Where
      }

      // Regular members can only see their own meetings
      return {
        and: [
          { site: { equals: siteId } },
          { or: [{ createdBy: { equals: user.id } }, { metWith: { equals: user.id } }] },
        ],
      } as Where
    },
    create: activeMember,
    update: createSiteScopedAdminOrOwner('createdBy'),
    delete: createSiteScopedAdminOrOwner('createdBy'),
  },
  hooks: {
    beforeChange: [
      async (args) => autoAssignSiteHook(args),
      // Validate that metWith user has membership in the same site
      async ({ data, req, operation }) => {
        if (operation !== 'create' && operation !== 'update') return data
        if (!data?.metWith) return data
        if (!req.payload) return data

        const metWithId = typeof data.metWith === 'object' ? data.metWith.id : data.metWith

        // SECURITY: Hostname-only site detection
        const hostname = getHostnameFromRequest(req)
        const currentSiteId = await getSiteIdFromHostname(hostname, req.payload)

        if (!currentSiteId) return data

        // Check if metWith user has membership in the current site
        const metWithMembership = await req.payload.find({
          collection: 'site-memberships',
          where: {
            user: { equals: metWithId },
            site: { equals: currentSiteId },
          },
          limit: 1,
        })

        if (metWithMembership.docs.length === 0) {
          throw new Error('Cannot create meeting with user who is not a member of this site')
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
        description: 'The organisation this meeting belongs to',
        condition: (data, siblingData, { user }) => user?.isSuperadmin === true,
      },
      access: {
        update: siteFieldAccess,
      },
    },
    {
      name: 'metWith',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: filterUsersBySiteMemberships,
      admin: {
        description: 'The member you met with',
      },
    },
    {
      name: 'invitedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: filterUsersBySiteMemberships,
      admin: {
        description: 'Who invited to the meeting',
      },
    },
    {
      name: 'location',
      type: 'text',
      required: true,
      admin: {
        description: 'Meeting location',
      },
    },
    {
      name: 'topics',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Topics of conversation',
      },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      name: 'comments',
      type: 'array',
      admin: {
        description: 'Comments from both participants',
      },
      fields: [
        {
          name: 'text',
          type: 'textarea',
          required: true,
        },
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          filterOptions: filterUsersBySiteMemberships,
        },
        {
          name: 'commentCreatedAt',
          type: 'date',
          admin: {
            readOnly: true,
            date: { pickerAppearance: 'dayAndTime' },
          },
        },
      ],
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: filterUsersBySiteMemberships,
      admin: {
        position: 'sidebar',
        description: 'Meeting creator (can edit/delete)',
      },
    },
  ],
  timestamps: true,
}
