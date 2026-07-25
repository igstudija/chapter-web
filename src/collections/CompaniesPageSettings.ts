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

export const CompaniesPageSettings: CollectionConfig = {
  slug: 'companies-page-settings',
  labels: {
    singular: 'Companies Page',
    plural: 'Companies Page',
  },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    hidden: hideOnSuperadminPanel,
    baseListFilter: siteBasedListFilter,
    components: {
      views: {
        list: {
          Component: '@/components/admin/CompaniesPageList',
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
