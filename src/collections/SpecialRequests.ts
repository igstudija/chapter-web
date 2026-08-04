import type { CollectionConfig } from 'payload'
import { activeMember, createAdminOrOwner, activeUsersFilter } from '../access'

export const SpecialRequests: CollectionConfig = {
  slug: 'special-requests',
  admin: {
    useAsTitle: 'request',
    defaultColumns: ['request', 'chapterOnly', 'createdAt'],
    group: 'Internal',
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    read: activeMember,
    create: activeMember,
    update: createAdminOrOwner('requestedBy'),
    delete: createAdminOrOwner('requestedBy'),
  },
  fields: [
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
      name: 'chapterOnly',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        description:
          'Keep this request inside our own chapter. Unticked, it is offered to the chapters we are linked to, along with your name, company, phone and email.',
      },
    },
    {
      /*
       * Dead, and kept on purpose for one deploy. The production build still
       * running SELECTs `is_public` in every special-requests query, so the
       * column has to survive until the chapterOnly code is what's live —
       * dropping it now is an instant 500 on every listing page. Removing
       * this field (and then the column) is the second half of the
       * expand/contract; nothing reads it, and the migration file carries
       * the real story for fresh installs.
       */
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'requestedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: activeUsersFilter,
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
