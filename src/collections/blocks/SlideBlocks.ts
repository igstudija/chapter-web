import type { Block, FilterOptionsProps, Where } from 'payload'
import { getHostnameFromRequest, isSuperadminHost } from '../../lib/hostname'
import { getSiteIdFromHostname } from '../../access/multisite'

const getSiteFilterOptions = async ({ req }: FilterOptionsProps): Promise<boolean | Where> => {
  if (!req) return false
  const hostname = getHostnameFromRequest(req)
  if (isSuperadminHost(hostname)) return true
  const siteId = await getSiteIdFromHostname(hostname, req.payload)
  if (!siteId) return { id: { equals: '' } }
  return { site: { equals: String(siteId) } }
}

const getMembershipFilterOptions = async ({ req }: FilterOptionsProps): Promise<boolean | Where> => {
  if (!req) return false
  const hostname = getHostnameFromRequest(req)
  if (isSuperadminHost(hostname)) return true
  const siteId = await getSiteIdFromHostname(hostname, req.payload)
  if (!siteId) return { id: { equals: '' } }
  return {
    site: { equals: String(siteId) },
    status: { equals: 'active' },
  }
}

const customSlideSecondsField = {
  name: 'customSlideSeconds',
  type: 'number',
  label: 'Custom Slide Duration (seconds)',
  admin: {
    description: 'Override slide duration (leave empty to use default)',
  },
} as const

export const LogoWallBlock: Block = {
  slug: 'logoWall',
  dbName: 'lw',
  labels: {
    singular: 'Slide: Logo Wall',
    plural: 'Slides: Logo Walls',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title (optional)',
      admin: {
        description: 'Optional title shown above the logo grid',
      },
    },
    customSlideSecondsField,
  ],
}

export const SpeechMasterBlock: Block = {
  slug: 'speechMaster',
  dbName: 'sm',
  labels: {
    singular: 'Slide: Speech Master',
    plural: 'Slides: Speech Masters',
  },
  fields: [
    {
      name: 'member',
      type: 'relationship',
      relationTo: 'site-memberships',
      required: true,
      label: 'Speech Master',
      admin: {
        description: 'Member to display with crown icon. Default duration uses speechMasterMultiplier.',
      },
      filterOptions: getMembershipFilterOptions,
    },
    customSlideSecondsField,
  ],
}

export const SpeechMasterCeremonyBlock: Block = {
  slug: 'speechMasterCeremony',
  dbName: 'sm_cer',
  labels: {
    singular: 'Slide: Speech Master Ceremony',
    plural: 'Slides: Speech Master Ceremonies',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title (optional)',
      admin: {
        description: 'Override the default "Runas Meistars" title shown above the photo',
      },
    },
    {
      name: 'member',
      type: 'relationship',
      relationTo: 'site-memberships',
      required: true,
      label: 'Speech Master',
      filterOptions: getMembershipFilterOptions,
    },
    customSlideSecondsField,
  ],
}

export const PowerGroupBlock: Block = {
  slug: 'powerGroup',
  dbName: 'pg',
  labels: {
    singular: 'Group: Power Group',
    plural: 'Groups: Power Groups',
  },
  fields: [
    {
      name: 'powerGroup',
      type: 'relationship',
      relationTo: 'power-groups',
      required: true,
      filterOptions: getSiteFilterOptions,
    },
    {
      name: 'disableTimer',
      type: 'checkbox',
      label: 'Disable Timer',
      defaultValue: false,
      admin: {
        description: "Disable auto-advance timer for this group's slides",
        width: '50%',
      },
    },
    {
      ...customSlideSecondsField,
      admin: {
        ...customSlideSecondsField.admin,
        width: '50%',
      },
    },
  ],
}

export const GuestsBlock: Block = {
  slug: 'guests',
  dbName: 'gu',
  labels: {
    singular: 'Group: Guests',
    plural: 'Groups: Guests',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title (optional)',
      admin: {
        description: 'Section title shown above guest list (e.g., "Topošie biedri")',
      },
    },
    {
      name: 'guestsText',
      type: 'textarea',
      required: true,
      label: 'Guests',
      admin: {
        description:
          'One guest per line: Name, Company, Description (comma-separated). Optional sub-section markers: #Online, #Onsite (case-insensitive).',
        rows: 12,
      },
    },
    customSlideSecondsField,
  ],
}

export const CustomImageBlock: Block = {
  slug: 'customImage',
  dbName: 'img',
  labels: {
    singular: 'Slide: Custom Image',
    plural: 'Slides: Custom Images',
  },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Image (16:9 landscape recommended)',
    },
    {
      name: 'displayMode',
      type: 'select',
      defaultValue: 'contain',
      options: [
        { label: 'Contain (fit within area)', value: 'contain' },
        { label: 'Cover (fill entire area)', value: 'cover' },
      ],
      admin: {
        width: '50%',
      },
    },
    {
      name: 'backgroundColor',
      type: 'text',
      defaultValue: '#000000',
      admin: {
        description: 'Background color visible in letterbox area',
        width: '50%',
      },
    },
    customSlideSecondsField,
  ],
}

export const SlideBlocks: Block[] = [
  LogoWallBlock,
  SpeechMasterBlock,
  SpeechMasterCeremonyBlock,
  PowerGroupBlock,
  GuestsBlock,
  CustomImageBlock,
]
