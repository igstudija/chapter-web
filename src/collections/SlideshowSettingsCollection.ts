import type { CollectionConfig, FilterOptionsProps } from 'payload'
import {
  siteScoped,
  siteScopedAdmin,
  siteField,
  autoAssignSiteHook,
  siteBasedListFilter,
  getSiteIdFromHostname,
} from '../access/multisite'
import { hideOnSuperadminPanel } from '../access/adminVisibility'
import { getHostnameFromRequest, isSuperadminHost } from '../lib/hostname'
import { SlideBlocks } from './blocks/SlideBlocks'

const getMembershipFilterOptions = async ({
  req,
}: FilterOptionsProps): Promise<
  | boolean
  | { id: { equals: string } }
  | { site: { equals: string }; status: { equals: string } }
> => {
  if (!req) return false

  const hostname = getHostnameFromRequest(req)

  if (isSuperadminHost(hostname)) {
    return true
  }

  const siteId = await getSiteIdFromHostname(hostname, req.payload)
  if (!siteId) return { id: { equals: '' } }

  return {
    site: { equals: String(siteId) },
    status: { equals: 'active' },
  }
}

export const SlideshowSettingsCollection: CollectionConfig = {
  slug: 'slideshow-settings-collection',
  labels: {
    singular: 'Slideshow',
    plural: 'Slideshow',
  },
  admin: {
    useAsTitle: 'internalTitle',
    group: 'Settings',
    hidden: hideOnSuperadminPanel,
    baseListFilter: siteBasedListFilter,
    components: {
      views: {
        list: {
          Component: '@/components/admin/SlideshowSettingsList',
        },
      },
    },
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
      name: 'internalTitle',
      type: 'text',
      admin: {
        hidden: true,
      },
      hooks: {
        beforeChange: [
          async ({ data, req }) => {
            if (data?.site) {
              const siteId = typeof data.site === 'object' ? data.site.id : data.site
              try {
                const site = await req.payload.findByID({
                  collection: 'sites',
                  id: siteId,
                })
                return `Slideshow - ${site.name}`
              } catch {
                return 'Slideshow'
              }
            }
            return 'Slideshow'
          },
        ],
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
      relationTo: 'site-memberships',
      hasMany: true,
      label: 'Skip Members from Slideshow',
      admin: {
        description: 'Members to skip from slideshow (e.g., absent members)',
        isSortable: true,
        allowCreate: false,
      },
      filterOptions: getMembershipFilterOptions,
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
