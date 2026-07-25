import type { CollectionConfig } from 'payload'
import { tinyEditor } from '../lib/tinyEditor'
import {
  siteScoped,
  siteScopedAdmin,
  siteField,
  autoAssignSiteHook,
  siteBasedListFilter,
} from '../access/multisite'
import { hideOnSuperadminPanel } from '../access/adminVisibility'
import { createSeoFields } from '../fields/seoFields'

export const FAQSettings: CollectionConfig = {
  slug: 'faq-settings',
  labels: {
    singular: 'FAQ',
    plural: 'FAQ',
  },
  admin: {
    useAsTitle: 'pageTitle',
    group: 'Content',
    hidden: hideOnSuperadminPanel,
    baseListFilter: siteBasedListFilter,
    components: {
      views: {
        list: {
          Component: '@/components/admin/FAQList',
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
      name: 'pageTitle',
      type: 'text',
      label: 'Page Title',
      defaultValue: 'Frequently Asked Questions',
      required: true,
    },
    {
      name: 'pageDescription',
      type: 'textarea',
      label: 'Page Description',
      defaultValue: 'Find answers to common questions about membership and our organisation.',
    },
    {
      name: 'faqs',
      type: 'array',
      label: 'FAQ Items',
      labels: {
        singular: 'FAQ Item',
        plural: 'FAQ Items',
      },
      fields: [
        {
          name: 'question',
          type: 'text',
          label: 'Question',
          required: true,
        },
        {
          name: 'answer',
          type: 'richText',
          label: 'Answer',
          required: true,
          editor: tinyEditor(),
        },
        {
          name: 'category',
          type: 'select',
          label: 'Category',
          options: [
            { label: 'General', value: 'general' },
            { label: 'Membership', value: 'membership' },
            { label: 'Meetings', value: 'meetings' },
            { label: 'Referrals', value: 'referrals' },
            { label: 'Events', value: 'events' },
            { label: 'Other', value: 'other' },
          ],
          defaultValue: 'general',
        },
        {
          name: 'order',
          type: 'number',
          label: 'Display Order',
          defaultValue: 0,
          admin: {
            description: 'Lower numbers appear first',
          },
        },
      ],
      admin: {
        initCollapsed: true,
      },
    },
    // SEO fields
    createSeoFields(),
  ],
}
