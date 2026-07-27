import type { Block } from 'payload'

/**
 * Member pickers on slides list active members.
 *
 * They used to resolve the request's host to an organisation and list that
 * organisation's active memberships; the organisation half of that is gone.
 */
const activeMembersOnly = () => ({ status: { equals: 'active' } })

const customSlideSecondsField = {
  name: 'customSlideSeconds',
  type: 'number',
  label: 'Custom Slide Duration (seconds)',
  admin: {
    description: 'Override slide duration (leave empty to use default)',
  },
} as const

/**
 * Strips a member slide down to its media — no photo, name, contacts, figures
 * or special request. For chapters that let members present their own slide and
 * don't want the profile furniture around it.
 */
const hideMemberInfoField = {
  name: 'hideMemberInfo',
  type: 'checkbox',
  label: 'Slides without member info',
  defaultValue: false,
  admin: {
    description:
      'The member slides this entry produces show only the image or video, filling the whole slide.',
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
      relationTo: 'members',
      required: true,
      label: 'Speech Master',
      admin: {
        description: 'Member to display with crown icon. Default duration uses speechMasterMultiplier.',
      },
      filterOptions: () => ({ status: { equals: 'active' } }),
    },
    customSlideSecondsField,
    hideMemberInfoField,
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
      relationTo: 'members',
      required: true,
      label: 'Speech Master',
      filterOptions: () => ({ status: { equals: 'active' } }),
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
    hideMemberInfoField,
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
