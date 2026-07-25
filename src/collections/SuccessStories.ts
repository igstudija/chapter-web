import type { CollectionConfig } from 'payload'
import { activeMember, adminOnly, activeUsersFilter } from '../access'

export const SuccessStories: CollectionConfig = {
  slug: 'success-stories',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'isPublic', 'createdAt'],
    group: 'Internal',
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    read: activeMember,
    create: activeMember,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Success story title',
      },
    },
    {
      name: 'story',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Describe your success story',
      },
    },
    {
      name: 'businessValue',
      type: 'text',
      admin: {
        description: 'Business value generated (e.g., "€5,000")',
      },
    },
    {
      name: 'partnerMember',
      type: 'relationship',
      relationTo: 'users',
      filterOptions: activeUsersFilter,
      admin: {
        description: 'The member who helped with this success',
      },
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Show this story publicly to other members',
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: activeUsersFilter,
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
