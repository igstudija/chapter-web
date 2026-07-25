import type { CollectionConfig } from 'payload'
import { anyone } from '../access'
import {
  siteScoped,
  siteScopedAdmin,
  siteFieldAccess,
  autoAssignSiteHook,
  siteBasedListFilter,
  createSiteScopedSlugValidation,
} from '../access/multisite'
import { hideOnSuperadminPanel } from '../access/adminVisibility'
import slugify from 'slugify'

export const PowerGroups: CollectionConfig = {
  slug: 'power-groups',
  admin: {
    useAsTitle: 'title',
    group: 'Settings',
    hidden: hideOnSuperadminPanel,
    baseListFilter: siteBasedListFilter,
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    read: anyone,
    create: siteScopedAdmin,
    update: siteScopedAdmin,
    delete: siteScopedAdmin,
  },
  hooks: {
    beforeValidate: [async (args) => autoAssignSiteHook(args)],
  },
  fields: [
    {
      name: 'site',
      type: 'relationship',
      relationTo: 'sites',
      required: false,
      hasMany: false,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'The organisation this power group belongs to',
        condition: (data, siblingData, { user }) => user?.isSuperadmin === true,
      },
      access: {
        update: siteFieldAccess,
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: {
        lv: 'Nosaukums',
        en: 'Title',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
      label: {
        lv: 'URL identifikators',
        en: 'Slug',
      },
      admin: {
        description: {
          lv: 'URL-draudzīgs identifikators (automātiski ģenerēts no nosaukuma, ja tukšs)',
          en: 'URL-friendly identifier (auto-generated from title if left empty)',
        },
      },
      validate: createSiteScopedSlugValidation('power-groups'),
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (!value && data?.title) {
              return slugify(data.title, { lower: true, strict: true })
            }
            return value
          },
        ],
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: {
        lv: 'Apraksts',
        en: 'Description',
      },
    },
  ],
}
