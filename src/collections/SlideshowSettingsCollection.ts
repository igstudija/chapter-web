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
      name: 'slideImageSeconds',
      type: 'number',
      label: 'Photo Sequence Length (seconds)',
      defaultValue: 30,
      min: 2,
      admin: {
        description:
          'How long a member\'s whole photo set takes to play through. Each photo gets an equal share — 2 photos change every 15s, 3 every 10s, and so on.',
      },
    },
    {
      name: 'slideChrome',
      type: 'select',
      label: 'Slideshow Controls',
      defaultValue: 'bar',
      options: [
        { label: 'Bar — solid control bar along the bottom', value: 'bar' },
        { label: 'Minimal — time strip at the very bottom, controls on hover', value: 'minimal' },
      ],
      admin: {
        description:
          'Minimal hands the full 1080px height to the slide and floats the counter, countdown and next speaker as badges. Presenters can switch live with C.',
      },
    },
    {
      name: 'nextSpeakerPosition',
      type: 'select',
      label: 'Next Speaker Badge',
      defaultValue: 'top',
      options: [
        { label: 'Top right', value: 'top' },
        { label: 'Bottom right', value: 'bottom' },
      ],
      admin: {
        description:
          'Minimal controls only. Bottom right sits closer to where a presenter looks between slides; top right stays clear of the request bar.',
      },
    },
    {
      name: 'specialRequestDisplay',
      type: 'select',
      label: 'Special Request',
      defaultValue: 'bar',
      options: [
        { label: 'Red bar along the bottom of the member slide', value: 'bar' },
        { label: 'Its own slide, right after the member', value: 'slide' },
        { label: 'Flashed in the middle for the last 5 seconds', value: 'flash' },
        { label: 'Not shown', value: 'off' },
      ],
      admin: {
        description:
          'The bar is always on screen; a dedicated slide gives the ask the whole screen; the flash keeps the slide clean until the member is nearly out of time.',
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
