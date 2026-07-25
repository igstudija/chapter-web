import type { CollectionConfig } from 'payload'
import {
  siteScopedActiveMember,
  createSiteScopedAdminOrOwner,
  siteFieldAccess,
  autoAssignSiteHook,
  siteBasedListFilter,
  filterUsersBySiteMemberships,
} from '../access/multisite'
import { hideOnSuperadminPanel } from '../access/adminVisibility'

export const SpecialRequests: CollectionConfig = {
  slug: 'special-requests',
  admin: {
    useAsTitle: 'request',
    defaultColumns: ['request', 'isPublic', 'createdAt'],
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
    update: createSiteScopedAdminOrOwner('requestedBy'),
    delete: createSiteScopedAdminOrOwner('requestedBy'),
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
        description: 'The organisation this request belongs to',
        condition: (data, siblingData, { user }) => user?.isSuperadmin === true,
      },
      access: {
        update: siteFieldAccess,
      },
    },
    {
      name: 'request',
      type: 'text',
      required: true,
      admin: {
        description: 'What are you looking for?',
      },
    },
    {
      name: 'registrationNumber',
      type: 'text',
      admin: {
        description: 'Company registration number if applicable',
      },
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Show this request publicly to other members',
      },
    },
    {
      name: 'requestedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: filterUsersBySiteMemberships,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'open',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Fulfilled', value: 'fulfilled' },
        { label: 'Closed', value: 'closed' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Display order in the member profile list (lower = higher up).',
      },
    },
    {
      name: 'showOnSlide',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Feature this request on the slideshow slide (one per member).',
      },
    },
  ],
  timestamps: true,
}
