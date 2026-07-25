import type { CollectionConfig } from 'payload'
import { activeMember, createAdminOrOwner, activeUsersFilter } from '../access'

export const Top40: CollectionConfig = {
  slug: 'top40',
  admin: {
    useAsTitle: 'companyName',
    defaultColumns: ['companyName', 'createdAt'],
    group: 'Internal',
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    read: activeMember,
    create: activeMember,
    update: createAdminOrOwner('submittedBy'),
    delete: createAdminOrOwner('submittedBy'),
  },
  fields: [
    {
      name: 'companyName',
      type: 'text',
      required: true,
    },
    {
      name: 'contactPerson',
      type: 'text',
      required: true,
    },
    {
      name: 'position',
      type: 'text',
      admin: {
        description: 'Job title / position',
      },
    },
    {
      name: 'registrationNumber',
      type: 'text',
      admin: {
        description: 'Company registration number',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
    },
    {
      name: 'businessTags',
      type: 'textarea',
      label: 'Business Tags',
      admin: {
        description: 'AI-generated business category tags (comma separated)',
        components: {
          Field: '@/components/admin/BusinessTagsField',
        },
      },
    },
    {
      name: 'submittedBy',
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
