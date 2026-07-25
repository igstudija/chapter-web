import type { CollectionConfig } from 'payload'
import { authenticated, adminOnly } from '../access'
import { createSeoFields } from '../fields/seoFields'

export const CompaniesPageSettings: CollectionConfig = {
  slug: 'companies-page-settings',
  labels: {
    singular: 'Companies Page',
    plural: 'Companies Page',
  },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    components: {
      views: {
        list: {
          Component: '@/components/admin/CompaniesPageList',
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
      defaultValue: 'Uzņēmumi',
    },
    {
      name: 'subtitle',
      type: 'text',
      label: 'Subtitle',
      defaultValue: 'Apmeklē mūs',
      admin: {
        description: 'Heading displayed above the description text',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: 'Descriptive text shown below the subtitle',
      },
    },
    {
      name: 'ctaLabel',
      type: 'text',
      label: 'CTA Button Text',
      defaultValue: 'APMEKLĒ MŪS',
      admin: {
        description: 'Text on the call-to-action button',
      },
    },
    {
      name: 'ctaLink',
      type: 'text',
      label: 'CTA Button Link',
      defaultValue: '/contacts',
      admin: {
        description: 'URL the button links to (e.g., /contacts)',
      },
    },
    createSeoFields(),
  ],
}
