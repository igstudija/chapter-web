'use client'

import { Search, X } from 'lucide-react'
import { useTranslations } from './TranslationsProvider'

/**
 * The filter box that every list in the member area carries. It was written
 * out five times with the same icon offsets and no way to get back to the
 * unfiltered list except selecting the text and deleting it — the clear
 * button is the whole reason this is one component now.
 *
 * `resultCount` is optional but worth passing: a search that matches nothing
 * otherwise looks identical to a list that failed to load.
 */
interface ListSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** Rendered beside the field as "N / total" once the user has typed. */
  resultCount?: number
  totalCount?: number
  /** Extra controls pinned to the right of the field (view toggles, export). */
  children?: React.ReactNode
  /**
   * Controls placed before the field — a list-scope switch belongs on the same
   * line as the search that filters it, not stacked above it.
   */
  leading?: React.ReactNode
  /** Pin the bar under the header so it stays reachable down a long list. */
  sticky?: boolean
  className?: string
}

export function ListSearch({
  value,
  onChange,
  placeholder,
  resultCount,
  totalCount,
  children,
  leading,
  sticky = false,
  className = '',
}: Readonly<ListSearchProps>) {
  const { t } = useTranslations()
  const isFiltering = value.trim().length > 0

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${sticky ? 'sticky-bar' : ''} ${className}`}
    >
      {leading}
      <div className="relative min-w-[12rem] flex-1">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-neutral-400"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field py-3 pl-11 pr-24 [&::-webkit-search-cancel-button]:appearance-none"
        />
        <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          {isFiltering && typeof resultCount === 'number' && (
            <span className="tabular font-mono text-[11px] text-ink-soft dark:text-neutral-400">
              {resultCount}
              {typeof totalCount === 'number' && (
                <span className="text-neutral-400 dark:text-neutral-500">/{totalCount}</span>
              )}
            </span>
          )}
          {isFiltering && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="icon-btn h-6 w-6"
              title={t('common', 'clearSearch')}
              aria-label={t('common', 'clearSearch')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}
