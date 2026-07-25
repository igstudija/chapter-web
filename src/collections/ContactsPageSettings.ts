import type { CollectionConfig } from 'payload'
import { authenticated, adminOnly } from '../access'
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
    components: {
      views: {
        list: {
          Component: '@/components/admin/ContactsPageList',
        },
      },
    },
  },
  access: {
    read: authenticated,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
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
          relationTo: 'members',
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
