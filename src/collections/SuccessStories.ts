import type { CollectionConfig } from 'payload'
import {
  siteScopedActiveMember,
  siteScopedAdmin,
  siteFieldAccess,
  autoAssignSiteHook,
  siteBasedListFilter,
  filterUsersBySiteMemberships,
} from '../access/multisite'
import { hideOnSuperadminPanel } from '../access/adminVisibility'

export const SuccessStories: CollectionConfig = {
  slug: 'success-stories',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'isPublic', 'createdAt'],
    group: 'Internal',
    hidden: hideOnSuperadminPanel,
    baseListFilter: siteBasedListFilter,
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    read: siteScopedActiveMember,
    create: siteScopedActiveMember,
    update: siteScopedAdmin,
    delete: siteScopedAdmin,
  },
  hooks: {
    beforeValidate: [async (args) => autoAssignSiteHook(args)],
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
        description: 'The organisation this story belongs to',
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
      filterOptions: filterUsersBySiteMemberships,
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
      filterOptions: filterUsersBySiteMemberships,
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
