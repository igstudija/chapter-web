import type { CollectionConfig } from 'payload'
import { authenticated, adminOnly, activeUsersFilter } from '../access'
import { htmlEditorField } from '../fields/HtmlEditor'
import { createSeoFields } from '../fields/seoFields'

export const AboutUsSettings: CollectionConfig = {
  slug: 'about-us-settings',
  labels: {
    singular: 'About Us',
    plural: 'About Us',
  },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    components: {
      views: {
        list: {
          Component: '@/components/admin/AboutUsList',
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
      defaultValue: 'About Us',
    },
    htmlEditorField({
      name: 'introduction',
      label: 'Introduction',
      required: true,
      admin: {
        description: 'General description of your organisation',
      },
    }),
    {
      name: 'chapterLeaders',
      type: 'array',
      label: 'Chapter Leadership Team',
      minRows: 1,
      admin: {
        description: 'Select members from your chapter to display as leadership team',
      },
      fields: [
        {
          name: 'member',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          filterOptions: activeUsersFilter,
          admin: {
            description: 'Select a member from your chapter',
          },
        },
        {
          name: 'position',
          type: 'text',
          required: true,
          admin: {
            description: 'e.g., President, Vice President, Secretary/Treasurer',
          },
        },
      ],
    },
    {
      name: 'howWeWork',
      type: 'group',
      label: 'How We Work',
      fields: [
        {
          name: 'title',
          type: 'text',
          defaultValue: 'How We Work',
        },
        htmlEditorField({
          name: 'description',
          label: 'Description',
          admin: {
            description: 'Describe how your organisation operates and its methodology',
          },
        }),
        {
          name: 'meetings',
          type: 'array',
          label: 'Meeting Schedule',
          admin: {
            description: 'Add up to 4 weekly meetings',
          },
          maxRows: 4,
          fields: [
            {
              name: 'frequency',
              type: 'text',
              required: true,
              admin: {
                placeholder: 'e.g., Every Thursday',
                description: 'How often do you meet?',
              },
            },
            {
              name: 'time',
              type: 'text',
              required: true,
              admin: { placeholder: 'e.g., 7:00 AM - 8:30 AM' },
            },
            {
              name: 'location',
              type: 'textarea',
              admin: { description: 'Meeting venue address' },
            },
            {
              name: 'isVirtual',
              type: 'checkbox',
              label: 'Virtual Meetings Available',
            },
          ],
        },
      ],
    },
    {
      name: 'principles',
      type: 'array',
      label: 'Core Values & Principles',
      admin: {
        description: 'Key principles your organisation follows',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          admin: { placeholder: 'e.g., Givers Gain' },
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      name: 'membershipInfo',
      type: 'group',
      label: 'Membership Information',
      fields: [
        {
          name: 'title',
          type: 'text',
          defaultValue: 'Join Our Chapter',
        },
        htmlEditorField({
          name: 'description',
          label: 'Description',
          admin: {
            description: 'Information about becoming a member',
          },
        }),
        {
          name: 'benefits',
          type: 'array',
          label: 'Membership Benefits',
          fields: [
            {
              name: 'benefit',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    // SEO fields
    createSeoFields(),
  ],
}
