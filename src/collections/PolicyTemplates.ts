import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'
import { htmlEditorField } from '../fields/HtmlEditor'

/** Only administrators see the policy templates. */
const hideForNonAdmin = ({ user }: { user: any }): boolean => !isAdmin(user)

/**
 * PolicyTemplates Collection
 *
 * Universal policy templates (Terms, Privacy, Cookies) managed from superadmin panel.
 * These templates are shared across all sites and support multiple languages.
 *
 * Supported placeholders:
 * - {site-name} - Site/chapter name
 * - {site-email} - Site contact email
  * - {site-domain} - Site domain (e.g., riga.example.org)
 * - {current-date} - Current date
 * - {last-updated} - Policy last updated date
 */

export const PolicyTemplates: CollectionConfig = {
  slug: 'policy-templates',
  labels: {
    singular: 'Policy Template',
    plural: 'Policy Templates',
  },
  admin: {
    useAsTitle: 'title',
    group: 'System',
    description:
      'Universal policy templates shared across all sites. Use placeholders like {site-name}, {site-email}, {site-domain}.',
    hidden: hideForNonAdmin,
    defaultColumns: ['title', 'type', 'locale', 'updatedAt'],
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    // Only superadmin can manage policy templates
    read: () => true, // Public read for frontend
    create: ({ req: { user } }) => isAdmin(user) === true,
    update: ({ req: { user } }) => isAdmin(user) === true,
    delete: ({ req: { user } }) => isAdmin(user) === true,
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Terms and Conditions', value: 'terms' },
        { label: 'Privacy Policy', value: 'privacy' },
        { label: 'Cookie Policy', value: 'cookies' },
      ],
      admin: {
        description: 'Type of policy document',
      },
    },
    {
      name: 'locale',
      type: 'select',
      required: true,
      options: [
        { label: 'Latvian (LV)', value: 'lv' },
        { label: 'English (EN)', value: 'en' },
      ],
      admin: {
        description: 'Language of this policy template',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Policy title (e.g., "Lietošanas noteikumi" or "Terms and Conditions")',
      },
    },
    htmlEditorField({
      name: 'content',
      label: 'Content',
      required: true,
      admin: {
        description:
          'Policy content. Available placeholders: {site-name}, {site-email}, {site-domain}, {current-date}, {last-updated}',
      },
    }),
    {
      name: 'lastUpdated',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'When this policy was last updated',
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'dd.MM.yyyy',
        },
      },
    },
    {
      name: 'placeholderHelp',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '@/components/admin/PolicyPlaceholderHelp',
        },
      },
    },
  ],
}
