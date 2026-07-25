import type { CollectionConfig } from 'payload'
import { authenticated, adminOnly } from '../access'
import { SlideBlocks } from './blocks/SlideBlocks'

/**
 * Member pickers list active members. The organisation half of this filter went
 * with multi-tenancy.
 */
const activeMembersOnly = () => ({ status: { equals: 'active' } })

export const SlideshowSettingsCollection: CollectionConfig = {
  slug: 'slideshow-settings-collection',
  labels: {
    singular: 'Slideshow',
    plural: 'Slideshow',
  },
  admin: {
    useAsTitle: 'internalTitle',
    group: 'Settings',
    components: {
      views: {
        list: {
          Component: '@/components/admin/SlideshowSettingsList',
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
      name: 'slideSeconds',
      type: 'number',
      label: 'Slide Duration (seconds)',
      defaultValue: 60,
      required: true,
      admin: {
        description: 'How long each slide is displayed',
      },
    },
    {
      name: 'speechMasterMultiplier',
      type: 'number',
      label: 'Speech Master Duration Multiplier',
      defaultValue: 2,
      admin: {
        description: 'Speech Master slide duration = slideSeconds × this value',
      },
    },
    {
      name: 'businessGivenMin',
      type: 'number',
      label: 'Show Given Business only if amount is at least (€)',
      defaultValue: 0,
      min: 0,
      admin: {
        description:
          'Members whose given business is below this amount will not show the row on their slide. 0 = always show.',
      },
    },
    {
      name: 'businessReceivedMin',
      type: 'number',
      label: 'Show Received Business only if amount is at least (€)',
      defaultValue: 0,
      min: 0,
      admin: {
        description:
          'Members whose received business is below this amount will not show the row on their slide. 0 = always show.',
      },
    },
    {
      name: 'slides',
      type: 'blocks',
      label: 'Slides',
      admin: {
        description: 'Drag to reorder; mix any block types freely.',
      },
      blocks: SlideBlocks,
    },
    {
      name: 'skipMembers',
      type: 'relationship',
      relationTo: 'members',
      hasMany: true,
      label: 'Skip Members from Slideshow',
      admin: {
        description: 'Members to skip from slideshow (e.g., absent members)',
        isSortable: true,
        allowCreate: false,
      },
      filterOptions: activeMembersOnly,
    },
    {
      name: 'transitionSound',
      type: 'upload',
      relationTo: 'media',
      label: 'Transition Sound',
      admin: {
        description: 'MP3 file that plays on the last second of each member slide',
      },
    },
  ],
}
