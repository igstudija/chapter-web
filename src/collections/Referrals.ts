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
 * Referrals Collection
 *
 * SECURITY: All site detection is hostname-based only.
 * No JWT fallback to prevent cross-site data access.
 */
export const Referrals: CollectionConfig = {
  slug: 'referrals',
  admin: {
    useAsTitle: 'description',
    defaultColumns: ['description', 'date', 'status', 'value'],
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

      // Admin can see all referrals in their site
      if (membership.role === 'member-admin') {
        return { site: { equals: siteId } } as Where
      }

      // Regular members can only see their own referrals
      return {
        and: [
          { site: { equals: siteId } },
          { or: [{ fromUser: { equals: user.id } }, { toUser: { equals: user.id } }] },
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
      // Validate that toUser has membership in the same site
      async ({ data, req, operation }) => {
        if (operation !== 'create' && operation !== 'update') return data
        if (!data?.toUser) return data
        if (!req.payload) return data

        const toUserId = typeof data.toUser === 'object' ? data.toUser.id : data.toUser

        // SECURITY: Hostname-only site detection
        const hostname = getHostnameFromRequest(req)
        const currentSiteId = await getSiteIdFromHostname(hostname, req.payload)

        if (!currentSiteId) return data

        // Check if toUser has membership in the current site
        const toUserMembership = await req.payload.find({
          collection: 'site-memberships',
          where: {
            user: { equals: toUserId },
            site: { equals: currentSiteId },
          },
          limit: 1,
        })

        if (toUserMembership.docs.length === 0) {
          throw new Error('Cannot create referral with user who is not a member of this site')
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
        description: 'The organisation this referral belongs to',
        condition: (data, siblingData, { user }) => user?.isSuperadmin === true,
      },
      access: {
        update: siteFieldAccess,
      },
    },
    {
      name: 'fromUser',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: filterUsersBySiteMemberships,
      admin: {
        description: 'Who gave the referral',
      },
    },
    {
      name: 'toUser',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: filterUsersBySiteMemberships,
      admin: {
        description: 'Who received the referral',
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
      name: 'description',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Description of the referral',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Success', value: 'success' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: {
        description: 'Referral outcome status',
      },
    },
    {
      name: 'value',
      type: 'number',
      admin: {
        description: 'Business value in EUR (only for successful referrals)',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: filterUsersBySiteMemberships,
      admin: {
        position: 'sidebar',
        description: 'Referral creator (can edit/delete)',
      },
    },
  ],
  timestamps: true,
}
