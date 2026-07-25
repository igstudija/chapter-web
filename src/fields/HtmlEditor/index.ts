import type { Field } from 'payload'

export const htmlEditorField = (overrides?: Partial<Field> & { name?: string }): Field => {
  const { name = 'content', ...rest } = overrides || {}

  return {
    name,
    type: 'textarea',
    admin: {
      components: {
        Field: '@/fields/HtmlEditor/Field#HtmlEditorField',
      },
    },
    ...rest,
  } as Field
}
