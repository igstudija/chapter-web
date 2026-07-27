'use client'

import { useState } from 'react'

const VISIBLE_COUNT = 3

interface TagCloudProps {
  tags: string
  className?: string
}

export function TagCloud({ tags, className = '' }: TagCloudProps) {
  const [expanded, setExpanded] = useState(false)

  const tagList = tags
    .split(',')
    .filter((s) => s.trim())
    .map((s) => s.trim())

  if (tagList.length === 0) return null

  const hasMore = tagList.length > VISIBLE_COUNT
  const visible = expanded ? tagList : tagList.slice(0, VISIBLE_COUNT)

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {visible.map((tag, i) => (
        <span key={i} className="chip">
          {tag}
        </span>
      ))}
      {hasMore && (
        // "…" gave no idea how much was hidden and "▲" was the only glyph in
        // the app doing the work of a control. The count states the offer.
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="tabular chip cursor-pointer font-mono hover:border-brand/40 hover:text-brand"
        >
          {expanded ? '−' : `+${tagList.length - VISIBLE_COUNT}`}
        </button>
      )}
    </div>
  )
}
