import type { CollectionConfig } from 'payload'
import {
  siteScoped,
  siteScopedAdmin,
  siteField,
  autoAssignSiteHook,
  siteBasedListFilter,
} from '../access/multisite'
import { hideOnSuperadminPanel } from '../access/adminVisibility'
import { createSeoFields } from '../fields/seoFields'

export const ContactsPageSettings: CollectionConfig = {
  slug: 'contacts-page-settings',
  labels: {
    singular: 'Contacts Page',
    plural: 'Contacts Page',
  },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    hidden: hideOnSuperadminPanel,
    baseListFilter: siteBasedListFilter,
    components: {
      views: {
        list: {
          Component: '@/components/admin/ContactsPageList',
        },
      },
    },
  },
  access: {
    read: siteScoped,
    create: siteScopedAdmin,
    update: siteScopedAdmin,
    delete: siteScopedAdmin,
  },
  hooks: {
    beforeValidate: [async (args) => autoAssignSiteHook(args)],
  },
  fields: [
    siteField({ required: true }),
    {
      name: 'title',
      type: 'text',
      required: true,
      defaultValue: 'Kontakti',
    },
    {
      name: 'contactPersons',
      type: 'array',
      label: 'Contact Persons',
      minRows: 1,
      admin: {
        description: 'Select members to display as contact persons',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'member',
          type: 'relationship',
          relationTo: 'site-memberships',
          required: true,
          admin: {
            description: 'Select a member from your chapter',
          },
        },
      ],
    },
    {
      name: 'formSettings',
      type: 'group',
      label: 'Contact Form Settings',
      fields: [
        {
          name: 'formTitle',
          type: 'text',
          defaultValue: 'RAKSTI MUMS',
          required: true,
        },
        {
          name: 'formDescription',
          type: 'textarea',
          defaultValue: 'We will answer your questions.',
        },
        {
          name: 'submitButtonText',
          type: 'text',
          defaultValue: 'Sūtīt',
          required: true,
        },
        {
          name: 'successMessage',
          type: 'textarea',
          defaultValue: 'Paldies! Mēs sazināsimies ar Jums tuvākajā laikā.',
          required: true,
        },
      ],
    },
    // SEO fields
    createSeoFields(),
  ],
}
