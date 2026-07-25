'use client'

import { useField, useTheme } from '@payloadcms/ui'
import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'

import type { TextareaFieldClientProps } from 'payload'

// Dynamically import TinyMCE to avoid SSR issues
const Editor = dynamic(() => import('@tinymce/tinymce-react').then((mod) => mod.Editor), {
  ssr: false,
})

export function HtmlEditorField(props: TextareaFieldClientProps) {
  const { path, field } = props
  const { value, setValue } = useField<string>({ path })
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const editorRef = useRef<any>(null)
  const isDark = theme === 'dark'

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleEditorChange = useCallback(
    (content: string) => {
      setValue(content)
    },
    [setValue],
  )

  const label = typeof field.label === 'string' ? field.label : field.name

  if (!mounted) {
    return (
      <div className="field-type textarea">
        <label className="field-label">{label}</label>
        <div
          style={{
            height: 300,
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 4,
            padding: 16,
            background: 'var(--theme-elevation-50)',
          }}
        >
          Loading editor...
        </div>
      </div>
    )
  }

  return (
    <div className="field-type textarea">
      <label className="field-label" style={{ marginBottom: 8, display: 'block' }}>
        {label}
      </label>
      <Editor
        key={theme}
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        onInit={(_evt, editor) => {
          editorRef.current = editor
        }}
        value={value || ''}
        onEditorChange={handleEditorChange}
        init={{
          min_height: 300,
          max_height: 600,
          autoresize_bottom_margin: 16,
          menubar: false,
          plugins: ['lists', 'link', 'autolink', 'autoresize', 'code'],
          toolbar:
            'undo redo | formatselect | bold italic underline strikethrough | alignleft aligncenter alignright | bullist numlist | blockquote | link | code | removeformat',
          block_formats:
            'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Blockquote=blockquote',
          content_style: isDark
            ? `
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 16px;
              line-height: 1.75;
              color: #e0e0e0;
              background-color: #1e1e1e;
            }
            h1 { font-size: 2em; font-weight: 700; margin: 1.5em 0 0.75em; color: #e0e0e0; }
            h2 { font-size: 1.5em; font-weight: 700; margin: 1.5em 0 0.75em; color: #e0e0e0; }
            h3 { font-size: 1.25em; font-weight: 700; margin: 1.25em 0 0.6em; color: #e0e0e0; }
            h4 { font-size: 1.1em; font-weight: 700; margin: 1em 0 0.5em; color: #e0e0e0; }
            p { margin: 1em 0; }
            blockquote { border-left: 4px solid #ff6b6b; padding-left: 1em; margin: 1em 0; font-style: italic; color: #b0b0b0; }
            a { color: #ff6b6b; text-decoration: underline; }
            ul, ol { margin: 1em 0; padding-left: 1.5em; }
            li { margin: 0.5em 0; }
          `
            : `
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 16px;
              line-height: 1.75;
              color: #333;
            }
            h1 { font-size: 2em; font-weight: 700; margin: 1.5em 0 0.75em; color: #333; }
            h2 { font-size: 1.5em; font-weight: 700; margin: 1.5em 0 0.75em; color: #333; }
            h3 { font-size: 1.25em; font-weight: 700; margin: 1.25em 0 0.6em; color: #333; }
            h4 { font-size: 1.1em; font-weight: 700; margin: 1em 0 0.5em; color: #333; }
            p { margin: 1em 0; }
            blockquote { border-left: 4px solid #c8102e; padding-left: 1em; margin: 1em 0; font-style: italic; color: #666; }
            a { color: #c8102e; text-decoration: underline; }
            ul, ol { margin: 1em 0; padding-left: 1.5em; }
            li { margin: 0.5em 0; }
          `,
          branding: false,
          promotion: false,
          skin: isDark ? 'oxide-dark' : 'oxide',
          content_css: isDark ? 'dark' : 'default',
          // Ensure proper space handling (no &nbsp;)
          entity_encoding: 'raw',
          forced_root_block: 'p',
        }}
      />
    </div>
  )
}
