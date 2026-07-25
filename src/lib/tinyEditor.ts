import type { RichTextAdapter } from 'payload'

export const tinyEditor = (): RichTextAdapter => ({
  CellComponent: '@/fields/HtmlEditor/Cell#HtmlEditorCell',
  FieldComponent: '@/fields/HtmlEditor/Field#HtmlEditorField',
  outputSchema: () => [
    {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  ],
  validate: () => true,
})
