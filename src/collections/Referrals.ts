import type { CollectionConfig, Where } from 'payload'
import { activeMember, activeUsersFilter, createAdminOrOwner, isAdmin } from '../access'

/**
 * Referrals Collection
 *
 * Business referrals passed from one member to another.
 */
export const Referrals: CollectionConfig = {
  slug: 'referrals',
  admin: {
    useAsTitle: 'description',
    defaultColumns: ['description', 'date', 'status', 'value'],
    group: 'Internal',
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    // Administrators see every referral; a member sees the ones they are part of.
    //
    // This was a database lookup per check: resolve the host to an
    // organisation, then load the caller's membership in it to read their role.
    // Role is on the user record now.
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return {
        or: [{ fromUser: { equals: user.id } }, { toUser: { equals: user.id } }],
      } as Where
    },
    create: activeMember,
    update: createAdminOrOwner('createdBy'),
    delete: createAdminOrOwner('createdBy'),
  },
  hooks: {
    beforeChange: [
      // The counterpart must be an active member. The check used to be
      // "a member of this site"; there is one membership list now.
      async ({ data, req, operation }) => {
        if (operation !== 'create' && operation !== 'update') return data
        if (!data?.toUser) return data
        if (!req.payload) return data

        const toUserId = typeof data.toUser === 'object' ? data.toUser.id : data.toUser

        const toUserMembership = await req.payload.find({
          collection: 'members',
          where: { user: { equals: toUserId } },
          limit: 1,
          depth: 0,
        })

        if (toUserMembership.docs.length === 0) {
          throw new Error('Cannot create a referral for someone who is not a member')
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'fromUser',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: activeUsersFilter,
      admin: {
        description: 'Who gave the referral',
      },
    },
    {
      name: 'toUser',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: activeUsersFilter,
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
      filterOptions: activeUsersFilter,
      admin: {
        position: 'sidebar',
        description: 'Referral creator (can edit/delete)',
      },
    },
  ],
  timestamps: true,
}
