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

/**
 * Top 20 — the companies/contacts a member is LOOKING FOR. Structurally
 * identical to Top 40 (companies a member offers/targets); kept as a separate
 * collection so the two lists are independent.
 */
export const Top20: CollectionConfig = {
  slug: 'top20',
  admin: {
    useAsTitle: 'companyName',
    defaultColumns: ['companyName', 'createdAt'],
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
    update: createSiteScopedAdminOrOwner('submittedBy'),
    delete: createSiteScopedAdminOrOwner('submittedBy'),
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
        description: 'The organisation this entry belongs to',
        condition: (data, siblingData, { user }) => user?.isSuperadmin === true,
      },
      access: {
        update: siteFieldAccess,
      },
    },
    {
      name: 'companyName',
      type: 'text',
      required: true,
    },
    {
      name: 'contactPerson',
      type: 'text',
      // Optional for Top 20 — a member may be looking for a company without a
      // specific contact person yet.
      required: false,
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
      filterOptions: filterUsersBySiteMemberships,
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
