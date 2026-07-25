import type { CollectionConfig, Where } from 'payload'
import { activeMember, activeUsersFilter, createAdminOrOwner, isAdmin } from '../access'

/**
 * OneToOneMeetings Collection
 *
 * One-to-one meetings between members, with the business value discussed.
 */
export const OneToOneMeetings: CollectionConfig = {
  slug: 'one-to-one-meetings',
  admin: {
    useAsTitle: 'location',
    defaultColumns: ['location', 'date', 'createdAt'],
    group: 'Internal',
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    // Administrators see every meeting; a member sees the ones they took part in.
    //
    // This was a database lookup per check: resolve the host to an
    // organisation, then load the caller's membership in it to read their role.
    // Role is on the user record now.
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return {
        or: [{ createdBy: { equals: user.id } }, { metWith: { equals: user.id } }],
      } as Where
    },
    create: activeMember,
    update: createAdminOrOwner('createdBy'),
    delete: createAdminOrOwner('createdBy'),
  },
  hooks: {
    beforeChange: [
      // The counterpart must be a member. The check used to be "a member of
      // this site"; there is one membership list now.
      async ({ data, req, operation }) => {
        if (operation !== 'create' && operation !== 'update') return data
        if (!data?.metWith) return data
        if (!req.payload) return data

        const metWithId = typeof data.metWith === 'object' ? data.metWith.id : data.metWith

        const metWithMembership = await req.payload.find({
          collection: 'members',
          where: { user: { equals: metWithId } },
          limit: 1,
          depth: 0,
        })

        if (metWithMembership.docs.length === 0) {
          throw new Error('Cannot record a meeting with someone who is not a member')
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'metWith',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: activeUsersFilter,
      admin: {
        description: 'The member you met with',
      },
    },
    {
      name: 'invitedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: activeUsersFilter,
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
          filterOptions: activeUsersFilter,
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
      filterOptions: activeUsersFilter,
      admin: {
        position: 'sidebar',
        description: 'Meeting creator (can edit/delete)',
      },
    },
  ],
  timestamps: true,
}
