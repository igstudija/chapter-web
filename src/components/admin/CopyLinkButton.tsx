'use client'

import { useState } from 'react'

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <button type="button" className="btn btn--style-primary btn--size-small" onClick={handleCopy}>
        {copied ? 'Nokopēts!' : 'Kopēt saiti'}
      </button>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem' }}>
        Atvērt
      </a>
    </div>
  )
}
