import type { CollectionConfig } from 'payload'
import { authenticated, adminOnly } from '../access'
import { createSeoFields } from '../fields/seoFields'

export const HomepageSettings: CollectionConfig = {
  slug: 'homepage-settings',
  labels: {
    singular: 'Homepage',
    plural: 'Homepage',
  },
  admin: {
    useAsTitle: 'internalTitle',
    group: 'Content',
    description: 'Edit the homepage hero section, statistics, and call-to-action.',
    components: {
      views: {
        list: {
          Component: '@/components/admin/HomepageList',
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
      name: 'internalTitle',
      type: 'text',
      admin: {
        hidden: true,
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Hero Section',
          description: 'The main banner at the top of the homepage',
          fields: [
            {
              name: 'hero',
              type: 'group',
              label: false,
              fields: [
                {
                  name: 'title',
                  label: 'Main Title',
                  type: 'text',
                  required: true,
                  defaultValue: 'Welcome',
                  admin: {
                    description: 'The main headline displayed in the hero',
                  },
                },
                {
                  name: 'highlightedText',
                  label: 'Highlighted Word',
                  type: 'text',
                  defaultValue: '',
                  admin: {
                    description: 'This word will appear in red within the title',
                    width: '50%',
                  },
                },
                {
                  name: 'description',
                  label: 'Subtitle',
                  type: 'textarea',
                  defaultValue:
                    'Connecting professionals and building lasting business relationships.',
                  admin: {
                    description: 'Supporting text below the main title',
                  },
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'primaryButtonText',
                      label: 'Primary Button Text',
                      type: 'text',
                      defaultValue: 'View Members',
                      admin: { width: '50%' },
                    },
                    {
                      name: 'primaryButtonLink',
                      label: 'Primary Button Link',
                      type: 'text',
                      defaultValue: '/companies',
                      admin: { width: '50%' },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'secondaryButtonText',
                      label: 'Secondary Button Text',
                      type: 'text',
                      defaultValue: 'Contact Us',
                      admin: { width: '50%' },
                    },
                    {
                      name: 'secondaryButtonLink',
                      label: 'Secondary Button Link',
                      type: 'text',
                      defaultValue: '/contacts',
                      admin: { width: '50%' },
                    },
                  ],
                },
                {
                  name: 'backgroundImage',
                  label: 'Background Image',
                  type: 'upload',
                  relationTo: 'media',
                  admin: {
                    description: 'Optional background image for the hero section',
                  },
                },
                {
                  name: 'enableOverlay',
                  label: 'Enable Dark Overlay',
                  type: 'checkbox',
                  defaultValue: true,
                  admin: {
                    description:
                      'Add a dark overlay over the background image to improve text readability',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Statistics',
          description: 'Numbers displayed in the red banner section',
          fields: [
            {
              name: 'stats',
              type: 'group',
              label: false,
              fields: [
                {
                  name: 'title',
                  label: 'Section Title',
                  type: 'text',
                  defaultValue: 'BY THE NUMBERS',
                },
                {
                  name: 'items',
                  label: 'Statistics',
                  type: 'array',
                  minRows: 1,
                  maxRows: 6,
                  admin: {
                    description: 'Add up to 6 statistics. They display in 2 rows of 3 on desktop.',
                    initCollapsed: false,
                  },
                  labels: {
                    singular: 'Statistic',
                    plural: 'Statistics',
                  },
                  fields: [
                    {
                      name: 'icon',
                      label: 'Icon',
                      type: 'text',
                      admin: {
                        placeholder: 'e.g., mdi:cash-multiple',
                        description:
                          'Iconify icon name (browse at https://icon-sets.iconify.design/)',
                      },
                    },
                    {
                      type: 'row',
                      fields: [
                        {
                          name: 'value',
                          label: 'Value',
                          type: 'text',
                          required: true,
                          admin: {
                            placeholder: 'e.g., €34,287,788',
                            width: '50%',
                          },
                        },
                        {
                          name: 'label',
                          label: 'Label',
                          type: 'text',
                          required: true,
                          admin: {
                            placeholder: 'e.g., Total Business Generated',
                            width: '50%',
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Call to Action',
          description: 'The red banner at the bottom of the homepage',
          fields: [
            {
              name: 'cta',
              type: 'group',
              label: false,
              fields: [
                {
                  name: 'title',
                  label: 'Heading',
                  type: 'text',
                  defaultValue: 'Ready to Grow Your Business?',
                },
                {
                  name: 'description',
                  label: 'Description',
                  type: 'textarea',
                  defaultValue:
                    'Join our network of professionals and start building valuable business relationships today.',
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'buttonText',
                      label: 'Button Text',
                      type: 'text',
                      defaultValue: 'Get in Touch',
                      admin: { width: '50%' },
                    },
                    {
                      name: 'buttonLink',
                      label: 'Button Link',
                      type: 'text',
                      defaultValue: '/contacts',
                      admin: { width: '50%' },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'SEO',
          description: 'Search engine optimization settings for the homepage',
          fields: [createSeoFields()],
        },
      ],
    },
  ],
}
