'use client'

import { ExternalLink, Star } from 'lucide-react'
import type { GroupableRequest } from '@/lib/specialRequestsGrouping'

interface SpecialRequestDetailsProps {
  request: GroupableRequest
  labels: {
    regNumber: string
    added: string
    updated: string
  }
  dateLocale: string
  /** Text colour for the star and the Lursoft link — lets the brand-free list opt out of the brand colour. */
  accentClass?: string
  compact?: boolean
}

/**
 * One special request rendered as text: headline, registration number, dates.
 * Used both for a member row's headline request and for each request inside an
 * expanded row, so the two always look and read the same.
 */
export function SpecialRequestDetails({
  request,
  labels,
  dateLocale,
  accentClass = 'text-brand',
  compact = false,
}: SpecialRequestDetailsProps) {
  const created = new Date(request.createdAt)
  const updated = new Date(request.updatedAt || request.createdAt)
  const createdText = created.toLocaleString(dateLocale)
  const updatedText = updated.toLocaleString(dateLocale)

  return (
    <div>
      <p
        className={`text-ink dark:text-surface-text font-medium flex items-start gap-2 ${
          compact ? 'text-sm' : ''
        }`}
      >
        {request.showOnSlide && (
          <Star className={`h-4 w-4 mt-1 shrink-0 fill-current ${accentClass}`} />
        )}
        <span>{request.request}</span>
      </p>

      {request.registrationNumber && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          {labels.regNumber}:{' '}
          <a
            href={`https://company.lursoft.lv/en/?c=${request.registrationNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`hover:underline inline-flex items-center gap-1 ${accentClass}`}
          >
            {request.registrationNumber}
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      )}

      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
        {labels.added}: {createdText}
        {updatedText !== createdText && (
          <>
            {' · '}
            {labels.updated}: {updatedText}
          </>
        )}
      </p>
    </div>
  )
}
