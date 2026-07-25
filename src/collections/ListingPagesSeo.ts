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

export const ListingPagesSeo: CollectionConfig = {
  slug: 'listing-pages-seo',
  labels: {
    singular: 'Listing Pages SEO',
    plural: 'Listing Pages SEO',
  },
  admin: {
    useAsTitle: 'title',
    group: 'SEO',
    hidden: hideOnSuperadminPanel,
    baseListFilter: siteBasedListFilter,
    description: 'Configure SEO settings for listing pages (Blog, Events, Companies, Success Stories)',
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
      admin: {
        hidden: true,
      },
      hooks: {
        beforeChange: [
          ({ siblingData }) => {
            return 'Listing Pages SEO'
          },
        ],
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Blog Page',
          description: 'SEO settings for the blog listing page (/blog)',
          fields: [
            {
              name: 'blogPage',
              type: 'group',
              label: '',
              fields: [
                {
                  name: 'pageTitle',
                  type: 'text',
                  label: 'Page Title',
                  admin: {
                    description: 'Title shown in browser tab and search results',
                  },
                },
                {
                  name: 'pageDescription',
                  type: 'textarea',
                  label: 'Page Description',
                  admin: {
                    description: 'Description for search engines',
                  },
                },
                createSeoFields({ includeAdvanced: true }),
              ],
            },
          ],
        },
        {
          label: 'Events Page',
          description: 'SEO settings for the events listing page (/events)',
          fields: [
            {
              name: 'eventsPage',
              type: 'group',
              label: '',
              fields: [
                {
                  name: 'pageTitle',
                  type: 'text',
                  label: 'Page Title',
                  admin: {
                    description: 'Title shown in browser tab and search results',
                  },
                },
                {
                  name: 'pageDescription',
                  type: 'textarea',
                  label: 'Page Description',
                  admin: {
                    description: 'Description for search engines',
                  },
                },
                createSeoFields({ includeAdvanced: true }),
              ],
            },
          ],
        },
        {
          label: 'Companies Page',
          description: 'SEO settings for the companies listing page (/companies)',
          fields: [
            {
              name: 'companiesPage',
              type: 'group',
              label: '',
              fields: [
                {
                  name: 'pageTitle',
                  type: 'text',
                  label: 'Page Title',
                  admin: {
                    description: 'Title shown in browser tab and search results',
                  },
                },
                {
                  name: 'pageDescription',
                  type: 'textarea',
                  label: 'Page Description',
                  admin: {
                    description: 'Description for search engines',
                  },
                },
                createSeoFields({ includeAdvanced: true }),
              ],
            },
          ],
        },
        {
          label: 'Success Stories',
          description: 'SEO settings for the success stories listing page (/success-stories)',
          fields: [
            {
              name: 'successStoriesPage',
              type: 'group',
              label: '',
              fields: [
                {
                  name: 'pageTitle',
                  type: 'text',
                  label: 'Page Title',
                  admin: {
                    description: 'Title shown in browser tab and search results',
                  },
                },
                {
                  name: 'pageDescription',
                  type: 'textarea',
                  label: 'Page Description',
                  admin: {
                    description: 'Description for search engines',
                  },
                },
                createSeoFields({ includeAdvanced: true }),
              ],
            },
          ],
        },
      ],
    },
  ],
}
