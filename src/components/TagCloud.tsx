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
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {visible.map((tag, i) => (
        <span
          key={i}
          className="text-[11px] bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded"
        >
          {tag}
        </span>
      ))}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] bg-neutral-200 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-300 px-1.5 py-0.5 rounded hover:bg-neutral-300 dark:hover:bg-neutral-500 transition-colors cursor-pointer"
        >
          {expanded ? '▲' : '...'}
        </button>
      )}
    </div>
  )
}
