'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Page-size selector plus pager, shared by the prospect and special-request
 * lists. Both had their own byte-identical copy declared *inside* the render
 * function, which meant React saw a brand-new component type on every keystroke
 * and threw away the select's DOM node — that is why picking "100" and then
 * typing in the search box could drop the focus ring.
 *
 * Defined at module scope, it keeps its identity across renders.
 */
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  pageSize: number
  pageSizeOptions: readonly number[]
  onPageSizeChange: (size: number) => void
  /** "Showing" label and "of {count} entries" template, localised by caller. */
  showLabel: string
  ofEntriesLabel: string
  totalCount: number
}

/** Five numbered buttons that slide with the cursor rather than paging in blocks. */
function pageWindow(currentPage: number, totalPages: number): number[] {
  const size = Math.min(5, totalPages)
  let start: number
  if (totalPages <= 5 || currentPage <= 3) {
    start = 1
  } else if (currentPage >= totalPages - 2) {
    start = totalPages - 4
  } else {
    start = currentPage - 2
  }
  return Array.from({ length: size }, (_, i) => start + i)
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  showLabel,
  ofEntriesLabel,
  totalCount,
}: Readonly<PaginationProps>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="eyebrow">{showLabel}</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="field tabular w-auto px-2 py-1 font-mono text-xs"
          aria-label={showLabel}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-sm text-ink-soft dark:text-neutral-400">
          {ofEntriesLabel.replace('{count}', totalCount.toString())}
        </span>
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="icon-btn h-8 w-8 disabled:pointer-events-none disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageWindow(currentPage, totalPages).map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              aria-current={currentPage === pageNum ? 'page' : undefined}
              className={`tabular h-8 w-8 rounded-md font-mono text-xs transition-colors ${
                currentPage === pageNum
                  ? 'bg-brand text-white'
                  : 'text-ink-soft hover:bg-neutral-100 hover:text-ink dark:text-neutral-400 dark:hover:bg-white/8 dark:hover:text-surface-text'
              }`}
            >
              {pageNum}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="icon-btn h-8 w-8 disabled:pointer-events-none disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  )
}
