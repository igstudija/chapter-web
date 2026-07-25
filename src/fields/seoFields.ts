import type { Field, GroupField } from 'payload'

/**
 * Standard SEO fields for content collections.
 * Includes meta tags, Open Graph, Twitter Cards, and schema.org support.
 */

// Basic SEO meta fields (title, description, keywords)
const metaFields: Field[] = [
  {
    name: 'metaTitle',
    type: 'text',
    label: 'Meta Title',
    admin: {
      description: 'Title shown in search results (50-60 characters recommended)',
    },
  },
  {
    name: 'metaDescription',
    type: 'textarea',
    label: 'Meta Description',
    admin: {
      description: 'Description shown in search results (150-160 characters recommended)',
    },
  },
  {
    name: 'keywords',
    type: 'text',
    label: 'Keywords',
    admin: {
      description: 'Comma-separated keywords for SEO (optional, less important for modern SEO)',
    },
  },
]

// Open Graph fields for social sharing
const openGraphFields: Field[] = [
  {
    name: 'ogTitle',
    type: 'text',
    label: 'OG Title',
    admin: {
      description: 'Title for social sharing (max 95 chars). Falls back to Meta Title if empty.',
    },
  },
  {
    name: 'ogDescription',
    type: 'textarea',
    label: 'OG Description',
    admin: {
      description: 'Description for social sharing (max 300 chars). Falls back to Meta Description if empty.',
    },
  },
  {
    name: 'ogImage',
    type: 'upload',
    relationTo: 'media',
    label: 'OG Image',
    admin: {
      description: 'Image for social sharing (1200x630px recommended)',
    },
  },
]

// Advanced SEO options
const advancedSeoFields: Field[] = [
  {
    name: 'canonicalUrl',
    type: 'text',
    label: 'Canonical URL',
    admin: {
      description: 'Override the canonical URL if needed',
    },
  },
  {
    type: 'row',
    fields: [
      {
        name: 'noIndex',
        type: 'checkbox',
        label: 'No Index',
        defaultValue: false,
        admin: {
          description: 'Hide from search engines',
          width: '50%',
        },
      },
      {
        name: 'noFollow',
        type: 'checkbox',
        label: 'No Follow',
        defaultValue: false,
        admin: {
          description: "Don't follow links",
          width: '50%',
        },
      },
    ],
  },
]

/**
 * Creates SEO fields group for content collections.
 * @param options - Configuration options
 * @param options.includeAdvanced - Include advanced SEO options (canonical, robots)
 * @param options.tab - Whether to render as a tab instead of a group
 */
export function createSeoFields(options?: {
  includeAdvanced?: boolean
  tab?: boolean
}): GroupField {
  const { includeAdvanced = true, tab = true } = options || {}

  const fields: Field[] = [...metaFields, ...openGraphFields]

  if (includeAdvanced) {
    fields.push(...advancedSeoFields)
  }

  return {
    name: 'seo',
    type: 'group',
    label: 'SEO',
    admin: {
      description: 'Search engine optimization settings',
    },
    fields,
  }
}

/**
 * Creates SEO tab field for collections with tabs.
 */
export function createSeoTab(options?: { includeAdvanced?: boolean }): Field {
  const seoGroup = createSeoFields(options)

  return {
    type: 'tabs',
    tabs: [
      {
        label: 'SEO',
        fields: seoGroup.fields,
      },
    ],
  }
}

/**
 * Site-level SEO settings with additional global options.
 * Used in SiteSettingsCollection for site-wide defaults.
 */
export const siteSeoFields: Field[] = [
  {
    name: 'seo',
    type: 'group',
    label: 'Site SEO',
    admin: {
      description: 'Default SEO settings for the entire site',
    },
    fields: [
      // Default meta
      {
        name: 'defaultTitle',
        type: 'text',
        label: 'Default Site Title',
        admin: {
          description: 'Used when page has no custom title',
        },
      },
      {
        name: 'titleSuffix',
        type: 'text',
        label: 'Title Suffix',
        admin: {
          description: 'Appended to page titles (e.g., " | Riga Business Club")',
        },
      },
      {
        name: 'defaultDescription',
        type: 'textarea',
        label: 'Default Meta Description',
        admin: {
          description: 'Used when page has no custom description',
        },
      },
      {
        name: 'defaultKeywords',
        type: 'text',
        label: 'Default Keywords',
        admin: {
          description: 'Site-wide keywords (comma-separated)',
        },
      },

      // Open Graph defaults
      {
        name: 'ogSiteName',
        type: 'text',
        label: 'OG Site Name',
        admin: {
          description: 'Site name for social sharing',
        },
      },
      {
        name: 'defaultOgImage',
        type: 'upload',
        relationTo: 'media',
        label: 'Default OG Image',
        admin: {
          description: 'Default image for social sharing when page has no image (1200x630px)',
        },
      },

      // Twitter/X Card settings
      {
        name: 'twitterCard',
        type: 'select',
        label: 'Twitter Card Type',
        defaultValue: 'summary_large_image',
        options: [
          { label: 'Summary', value: 'summary' },
          { label: 'Summary with Large Image', value: 'summary_large_image' },
        ],
      },
      {
        name: 'twitterSite',
        type: 'text',
        label: 'Twitter @username',
        admin: {
          description: 'X / Twitter account for the site (e.g., @rigabusiness)',
        },
      },

      // Verification codes
      {
        name: 'googleVerification',
        type: 'text',
        label: 'Google Site Verification',
        admin: {
          description: 'Google Search Console verification code',
        },
      },
      {
        name: 'bingVerification',
        type: 'text',
        label: 'Bing Site Verification',
        admin: {
          description: 'Bing Webmaster Tools verification code',
        },
      },

      // Robots
      {
        name: 'robotsTxt',
        type: 'textarea',
        label: 'robots.txt Content',
        admin: {
          description: 'Custom robots.txt content (leave empty for default)',
        },
      },
    ],
  },

  // Schema.org / Structured Data
  {
    name: 'schema',
    type: 'group',
    label: 'Structured Data (Schema.org)',
    admin: {
      description: 'Schema.org structured data for rich snippets',
    },
    fields: [
      {
        name: 'organizationType',
        type: 'select',
        label: 'Organization Type',
        defaultValue: 'Organization',
        options: [
          { label: 'Organization', value: 'Organization' },
          { label: 'LocalBusiness', value: 'LocalBusiness' },
          { label: 'ProfessionalService', value: 'ProfessionalService' },
          { label: 'Corporation', value: 'Corporation' },
        ],
      },
      {
        name: 'organizationName',
        type: 'text',
        label: 'Organization Name',
        admin: {
          description: 'Legal name of the organization',
        },
      },
      {
        name: 'organizationLogo',
        type: 'upload',
        relationTo: 'media',
        label: 'Organization Logo',
        admin: {
          description: 'Logo for schema.org (min 112x112px, recommended 1200x630px)',
        },
      },
      {
        name: 'foundingDate',
        type: 'date',
        label: 'Founding Date',
        admin: {
          date: {
            pickerAppearance: 'dayOnly',
          },
        },
      },
      {
        name: 'address',
        type: 'group',
        label: 'Address',
        fields: [
          {
            name: 'streetAddress',
            type: 'text',
            label: 'Street Address',
          },
          {
            name: 'city',
            type: 'text',
            label: 'City',
          },
          {
            name: 'postalCode',
            type: 'text',
            label: 'Postal Code',
          },
          {
            name: 'country',
            type: 'text',
            label: 'Country',
            defaultValue: 'Latvia',
          },
        ],
      },
      {
        name: 'contactPhone',
        type: 'text',
        label: 'Contact Phone',
      },
      {
        name: 'contactEmail',
        type: 'email',
        label: 'Contact Email',
      },
      {
        name: 'sameAs',
        type: 'array',
        label: 'Social Profiles (sameAs)',
        admin: {
          description: 'Links to social media profiles for schema.org',
        },
        fields: [
          {
            name: 'url',
            type: 'text',
            required: true,
          },
        ],
      },
    ],
  },
]
