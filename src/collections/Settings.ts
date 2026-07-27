import type { CollectionConfig } from 'payload'
import { authenticated, adminOnly } from '../access'
import { siteSeoFields } from '../fields/seoFields'
import { DEFAULT_ORG_NAME } from '../lib/branding'

export const Settings: CollectionConfig = {
  slug: 'settings',
  labels: {
    singular: 'Site',
    plural: 'Site',
  },
  admin: {
    useAsTitle: 'internalTitle',
    group: 'Settings',
    description:
      'Configure site-wide settings including branding, contact information, and social media.',
    components: {
      views: {
        list: {
          Component: '@/components/admin/SiteSettingsList',
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
      hooks: {
        beforeChange: [({ data }) => data?.siteName || 'Site'],
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Organisation',
          description: 'Language, timezone, and which modules members can use',
          fields: [
            // These lived on the Sites record while one install could serve
            // several organisations. There is one organisation now, so they
            // are simply settings.
            {
              name: 'locale',
              type: 'select',
              defaultValue: 'lv',
              required: true,
              options: [
                { label: 'English', value: 'en' },
                { label: 'Latvian', value: 'lv' },
              ],
              admin: {
                description: 'Language used for the member portal and outgoing email',
              },
            },
            {
              name: 'timezone',
              type: 'text',
              defaultValue: 'Europe/Riga',
              admin: {
                description: 'IANA timezone name, e.g. Europe/Riga',
              },
            },
            {
              name: 'enableAttendance',
              type: 'checkbox',
              defaultValue: false,
              label: 'Enable Attendance Tracking',
            },
            {
              name: 'enableSuccessStories',
              type: 'checkbox',
              defaultValue: true,
              label: 'Enable Success Stories',
            },
          ],
        },
        {
          label: 'Branding',
          description: 'Site logo, name, and visual identity',
          fields: [
            {
              name: 'siteName',
              label: 'Site Name',
              type: 'text',
              required: true,
              defaultValue: DEFAULT_ORG_NAME,
              admin: {
                description: 'The name of your site displayed in the browser and header',
              },
            },
            {
              name: 'siteLogo',
              label: 'Site Logo',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description:
                  'Main logo displayed in the header (recommended: SVG or PNG with transparent background)',
              },
            },
          ],
        },
        {
          label: 'Favicons',
          description: 'Upload favicons for different devices and browsers',
          fields: [
            {
              name: 'favicon16',
              label: 'Favicon 16x16',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Small favicon for browser tabs (16x16 PNG)',
              },
            },
            {
              name: 'favicon32',
              label: 'Favicon 32x32',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Standard favicon for browser tabs (32x32 PNG)',
              },
            },
            {
              name: 'appleTouchIcon',
              label: 'Apple Touch Icon',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Icon for iOS devices when site is saved to home screen (180x180 PNG)',
              },
            },
            {
              name: 'favicon192',
              label: 'Android Chrome Icon 192x192',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Icon for Android devices (192x192 PNG)',
              },
            },
            {
              name: 'favicon512',
              label: 'Android Chrome Icon 512x512',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Large icon for Android devices (512x512 PNG)',
              },
            },
          ],
        },
        {
          label: 'Contact',
          description: 'Admin email addresses for form submissions',
          fields: [
            {
              name: 'adminEmails',
              label: 'Admin Email Addresses',
              type: 'array',
              minRows: 1,
              admin: {
                description: 'Email addresses that will receive form submissions and notifications',
                initCollapsed: false,
              },
              labels: {
                singular: 'Email',
                plural: 'Emails',
              },
              fields: [
                {
                  name: 'email',
                  label: 'Email Address',
                  type: 'email',
                  required: true,
                  admin: {
                    placeholder: 'admin@example.com',
                  },
                },
              ],
              defaultValue: [],
            },
          ],
        },
        {
          label: 'Email Configuration',
          description: 'Configure sender email address and name for outgoing emails',
          fields: [
            {
              name: 'emailFrom',
              label: 'Sender Email Address',
              type: 'email',
              required: true,
              defaultValue: '',
              admin: {
                description:
                  'Email address used as sender for all outgoing emails (notifications, password resets, etc.)',
                placeholder: 'noreply@yourdomain.com',
              },
            },
            {
              name: 'emailFromName',
              label: 'Sender Name',
              type: 'text',
              required: true,
              defaultValue: DEFAULT_ORG_NAME,
              admin: {
                description: 'Display name shown as sender for all outgoing emails',
                placeholder: 'Organisation name',
              },
            },
          ],
        },
        {
          label: 'Social Media',
          description: 'Social media profile links',
          fields: [
            {
              name: 'socialMedia',
              type: 'group',
              label: false,
              fields: [
                {
                  name: 'facebook',
                  label: 'Facebook URL',
                  type: 'text',
                  admin: {
                    placeholder: 'https://facebook.com/yourpage',
                    description: 'Full URL to your Facebook page',
                  },
                },
                {
                  name: 'instagram',
                  label: 'Instagram URL',
                  type: 'text',
                  admin: {
                    placeholder: 'https://instagram.com/yourprofile',
                    description: 'Full URL to your Instagram profile',
                  },
                },
                {
                  name: 'twitter',
                  label: 'Twitter/X URL',
                  type: 'text',
                  admin: {
                    placeholder: 'https://twitter.com/yourprofile',
                    description: 'Full URL to your Twitter/X profile',
                  },
                },
                {
                  name: 'linkedin',
                  label: 'LinkedIn URL',
                  type: 'text',
                  admin: {
                    placeholder: 'https://linkedin.com/company/yourcompany',
                    description: 'Full URL to your LinkedIn page',
                  },
                },
                {
                  name: 'tiktok',
                  label: 'TikTok URL',
                  type: 'text',
                  admin: {
                    placeholder: 'https://tiktok.com/@yourprofile',
                    description: 'Full URL to your TikTok profile',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Analytics & Tracking',
          description: 'Configure Google Analytics, Google Tag Manager, and Facebook Pixel',
          fields: [
            {
              name: 'googleAnalyticsId',
              label: 'Google Analytics ID',
              type: 'text',
              admin: {
                placeholder: 'G-XXXXXXXXXX',
                description: 'Your Google Analytics 4 Measurement ID (starts with G-)',
              },
            },
            {
              name: 'googleTagManagerId',
              label: 'Google Tag Manager ID',
              type: 'text',
              admin: {
                placeholder: 'GTM-XXXXXXX',
                description: 'Your Google Tag Manager Container ID (starts with GTM-)',
              },
            },
            {
              name: 'facebookPixelId',
              label: 'Facebook Pixel ID',
              type: 'text',
              admin: {
                placeholder: '1234567890123456',
                description: 'Your Facebook Pixel ID (numeric)',
              },
            },
          ],
        },
        {
          label: 'SEO',
          description: 'Search engine optimization and social sharing defaults',
          fields: siteSeoFields,
        },
      ],
    },
  ],
}
