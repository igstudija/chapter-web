import type { CollectionConfig } from 'payload'
import { adminOnly, anyone, createUniqueSlugValidation } from '../access'
import slugify from 'slugify'

export const PowerGroups: CollectionConfig = {
  slug: 'power-groups',
  admin: {
    useAsTitle: 'title',
    group: 'Settings',
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    read: anyone,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
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
      validate: createUniqueSlugValidation('power-groups'),
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
