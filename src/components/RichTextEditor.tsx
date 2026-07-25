'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ComponentProps } from 'react'
import dynamic from 'next/dynamic'

type TinyMCEEditorProps = ComponentProps<typeof import('@tinymce/tinymce-react').Editor>

// Dynamically import TinyMCE to avoid SSR issues
const Editor = dynamic<TinyMCEEditorProps>(
  () => import('@tinymce/tinymce-react').then((mod) => mod.Editor),
  { ssr: false },
)

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
  toolbar?: string
  plugins?: string[]
}

const DEFAULT_TOOLBAR =
  'undo redo | formatselect | bold italic underline strikethrough | alignleft aligncenter alignright | bullist numlist | blockquote | link | code | removeformat'
const DEFAULT_PLUGINS = ['lists', 'link', 'autolink', 'autoresize', 'code']

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  height = 200,
  toolbar = DEFAULT_TOOLBAR,
  plugins = DEFAULT_PLUGINS,
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const editorRef = useRef<any>(null)

  useEffect(() => {
    setMounted(true)
    // Check for dark mode
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDarkMode()

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  const handleEditorChange = useCallback(
    (content: string) => {
      onChange(content)
    },
    [onChange],
  )

  if (!mounted) {
    return (
      <div
        className="border border-neutral-300 dark:border-neutral-600 rounded-lg overflow-hidden"
        style={{ height }}
      >
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
          Ielādē redaktoru...
        </div>
      </div>
    )
  }

  return (
    <div className="tinymce-frontend-wrapper">
      <Editor
        key={isDark ? 'dark' : 'light'}
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        onInit={(_evt, editor) => {
          editorRef.current = editor
        }}
        value={value || ''}
        onEditorChange={handleEditorChange}
        init={{
          min_height: height,
          max_height: 500,
          autoresize_bottom_margin: 16,
          menubar: false,
          plugins,
          toolbar,
          block_formats:
            'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Blockquote=blockquote',
          placeholder,
          content_style: isDark
            ? `
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #e0e0e0;
              background-color: #1e1e1e;
              margin: 8px;
            }
            h1 { font-size: 2em; font-weight: 700; margin: 1.5em 0 0.75em; color: #e0e0e0; }
            h2 { font-size: 1.4em; font-weight: 700; margin: 1em 0 0.5em; color: #e0e0e0; }
            h3 { font-size: 1.2em; font-weight: 700; margin: 1em 0 0.5em; color: #e0e0e0; }
            h4 { font-size: 1.1em; font-weight: 700; margin: 1em 0 0.5em; color: #e0e0e0; }
            p { margin: 0.75em 0; }
            blockquote { border-left: 4px solid #ff6b6b; padding-left: 1em; margin: 1em 0; font-style: italic; color: #b0b0b0; }
            a { color: #ff6b6b; text-decoration: underline; }
            ul, ol { margin: 0.75em 0; padding-left: 1.5em; }
            li { margin: 0.25em 0; }
          `
            : `
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #333;
              margin: 8px;
            }
            h1 { font-size: 2em; font-weight: 700; margin: 1.5em 0 0.75em; }
            h2 { font-size: 1.4em; font-weight: 700; margin: 1em 0 0.5em; }
            h3 { font-size: 1.2em; font-weight: 700; margin: 1em 0 0.5em; }
            h4 { font-size: 1.1em; font-weight: 700; margin: 1em 0 0.5em; }
            p { margin: 0.75em 0; }
            blockquote { border-left: 4px solid #c8102e; padding-left: 1em; margin: 1em 0; font-style: italic; color: #666; }
            a { color: #c8102e; text-decoration: underline; }
            ul, ol { margin: 0.75em 0; padding-left: 1.5em; }
            li { margin: 0.25em 0; }
          `,
          branding: false,
          promotion: false,
          skin: isDark ? 'oxide-dark' : 'oxide',
          content_css: isDark ? 'dark' : 'default',
          entity_encoding: 'raw',
          forced_root_block: 'p',
          statusbar: false,
        }}
      />
      <style jsx global>{`
        .tinymce-frontend-wrapper .tox-tinymce {
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
        }
        .dark .tinymce-frontend-wrapper .tox-tinymce {
          border-color: #525252;
        }
        .tinymce-frontend-wrapper .tox-tinymce:focus-within {
          outline: 2px solid #c8102e;
          outline-offset: -1px;
        }
      `}</style>
    </div>
  )
}
