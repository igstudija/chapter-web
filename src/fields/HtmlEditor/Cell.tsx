'use client'

export function HtmlEditorCell({ data }: { data: any }) {
  if (!data) return <span>-</span>

  // Strip HTML tags for cell display
  const text = typeof data === 'string' ? data.replace(/<[^>]*>/g, '').substring(0, 100) : '-'

  return <span>{text}</span>
}
