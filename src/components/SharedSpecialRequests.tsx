'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ExternalLink, Search } from 'lucide-react'
import {
  buildMemberEntries,
  getRequester,
  requestCountLabel,
  type GroupableRequest,
  type MemberEntry,
} from '@/lib/specialRequestsGrouping'
import { SpecialRequestDetails } from '@/components/SpecialRequestDetails'
import { buildDirectorySearchUrl } from '@/lib/directorySearch'

export interface SharedChapter {
  siteId: string
  /** Full organisation name, e.g. "Riga Business Club". */
  name: string
  /** Short name used on the per-row badge, e.g. "Riga". */
  label: string
  requests: GroupableRequest[]
  companyByUserId: Record<string, string>
}

interface SharedLabels {
  title: string
  subtitle: string
  validUntil: string
  members: string
  requests: string
  noRequests: string
  searchPlaceholder: string
  regNumber: string
  added: string
  updated: string
  unknown: string
  requestSingular: string
  requestPlural: string
  expand: string
  collapse: string
  allRequests: string
  chapter: string
  period: string
  all: string
  thisWeek: string
  thisMonth: string
  directoryProfile: string
}

interface SharedSpecialRequestsProps {
  chapters: SharedChapter[]
  locale: string
  validUntil: string
  /** Null when no external directory is configured; the link is then hidden. */
  directorySearchTemplate: string | null
  labels: SharedLabels
}

type Period = 'all' | 'week' | 'month'

// Shades of red, so the chapters stay tellable apart inside one merged stream.
// Class names are spelled out in full — Tailwind only sees literal strings.
const CHAPTER_ACCENTS = [
  { border: 'border-brand', text: 'text-brand', badge: 'bg-brand text-white' },
  { border: 'border-red-900', text: 'text-red-900', badge: 'bg-red-900 text-white' },
  { border: 'border-rose-500', text: 'text-rose-500', badge: 'bg-rose-500 text-white' },
]

/** Start of the current week (Monday 00:00) / month, in the viewer's own timezone. */
function periodStart(period: Period): number | null {
  if (period === 'all') return null

  const now = new Date()
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  }

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // getDay(): 0 = Sunday, so Sunday counts as the 7th day of the week that began Monday.
  const daysSinceMonday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - daysSinceMonday)
  return start.getTime()
}

function matchesQuery(
  request: GroupableRequest,
  query: string,
  companyByUserId: Record<string, string>,
): boolean {
  const requester = getRequester(request)
  const name = requester ? `${requester.name} ${requester.surname}`.toLowerCase() : ''
  const company = requester ? (companyByUserId[String(requester.id)] ?? '').toLowerCase() : ''

  return (
    request.request.toLowerCase().includes(query) ||
    name.includes(query) ||
    company.includes(query) ||
    Boolean(request.registrationNumber?.toLowerCase().includes(query))
  )
}

interface Row {
  key: string
  entry: MemberEntry
  chapter: SharedChapter
  accent: (typeof CHAPTER_ACCENTS)[number]
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'border-brand bg-brand text-white'
          : 'border-neutral-300 bg-white text-neutral-600 hover:border-brand hover:text-brand'
      }`}
    >
      {children}
    </button>
  )
}

export function SharedSpecialRequests({
  chapters,
  locale,
  validUntil,
  directorySearchTemplate,
  labels,
}: SharedSpecialRequestsProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [chapterFilter, setChapterFilter] = useState<string>('all')
  // The link is a weekly one, so the list opens on this week's requests by default.
  const [period, setPeriod] = useState<Period>('week')
  // Keyed by chapter + member, so the same person in two chapters expands independently.
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const dateLocale = locale === 'lv' ? 'lv-LV' : 'en-US'

  const { rows, totalRequests } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const since = periodStart(period)
    const collected: Row[] = []
    let requestCount = 0

    chapters.forEach((chapter, index) => {
      if (chapterFilter !== 'all' && chapterFilter !== chapter.siteId) return

      // The period narrows the whole dataset, not just which rows appear: counts and
      // expanded contents must agree with the filter the viewer has on screen.
      const inPeriod =
        since === null
          ? chapter.requests
          : chapter.requests.filter((request) => new Date(request.createdAt).getTime() >= since)

      const matching = query
        ? inPeriod.filter((request) => matchesQuery(request, query, chapter.companyByUserId))
        : inPeriod

      requestCount += inPeriod.length

      for (const entry of buildMemberEntries(matching, inPeriod)) {
        collected.push({
          key: `${chapter.siteId}:${entry.memberId}`,
          entry,
          chapter,
          accent: CHAPTER_ACCENTS[index % CHAPTER_ACCENTS.length],
        })
      }
    })

    collected.sort((a, b) => b.entry.lastActivity.localeCompare(a.entry.lastActivity))
    return { rows: collected, totalRequests: requestCount }
  }, [chapters, chapterFilter, period, searchQuery])

  const validUntilText = new Date(validUntil).toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-8 sm:px-6 lg:px-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            {labels.subtitle}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-neutral-900">{labels.title}</h1>
          <p className="mt-2 text-sm text-neutral-500">
            {labels.validUntil}: {validUntilText}
          </p>
        </header>
      </div>

      {/* Search + filters stay reachable while scrolling a long list. The bar itself
          spans the viewport — only its contents are held to the content column — so
          the divider under it runs edge to edge. */}
      <div className="sticky top-0 z-10 border-b border-neutral-300 bg-neutral-100/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={labels.searchPlaceholder}
              className="w-full rounded-lg border border-neutral-300 bg-white py-3 pl-12 pr-4 text-neutral-800 outline-none focus:border-transparent focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {labels.chapter}
              </span>
              <FilterButton
                active={chapterFilter === 'all'}
                onClick={() => setChapterFilter('all')}
              >
                {labels.all}
              </FilterButton>
              {chapters.map((chapter) => (
                <FilterButton
                  key={chapter.siteId}
                  active={chapterFilter === chapter.siteId}
                  onClick={() => setChapterFilter(chapter.siteId)}
                >
                  {chapter.label}
                </FilterButton>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {labels.period}
              </span>
              <FilterButton active={period === 'all'} onClick={() => setPeriod('all')}>
                {labels.all}
              </FilterButton>
              <FilterButton active={period === 'week'} onClick={() => setPeriod('week')}>
                {labels.thisWeek}
              </FilterButton>
              <FilterButton active={period === 'month'} onClick={() => setPeriod('month')}>
                {labels.thisMonth}
              </FilterButton>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <p className="mb-4 text-sm text-neutral-500">
          {rows.length} {labels.members} · {totalRequests} {labels.requests}
        </p>

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-12 text-center text-sm text-neutral-500">
            {labels.noRequests}
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map(({ key, entry, chapter, accent }) => {
              const requester = getRequester(entry.displayRequest)
              const fullName = requester ? `${requester.name} ${requester.surname}` : null
              const company = chapter.companyByUserId[entry.memberId] ?? null
              const isExpanded = expandedKey === key
              const canExpand = entry.totalCount > 1

              return (
                <li
                  key={key}
                  className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col md:flex-row">
                    <div
                      className={`flex shrink-0 flex-col justify-center border-l-4 p-4 md:w-64 ${accent.border}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-neutral-900">
                          {fullName ?? labels.unknown}
                        </p>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${accent.badge}`}
                        >
                          {chapter.label}
                        </span>
                      </div>
                      {company && (
                        <p className="mt-0.5 truncate text-sm text-neutral-500">{company}</p>
                      )}
                      {(() => {
                        // No external directory configured → no link at all,
                        // rather than an anchor pointing nowhere.
                        const directoryUrl = fullName
                          ? buildDirectorySearchUrl(fullName, directorySearchTemplate)
                          : null
                        if (!directoryUrl) return null
                        return (
                          <a
                            href={directoryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 hover:underline"
                          >
                            {labels.directoryProfile}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )
                      })()}
                    </div>

                    <div className="flex-1 p-4">
                      <SpecialRequestDetails
                        request={entry.displayRequest}
                        labels={labels}
                        dateLocale={dateLocale}
                        accentClass={accent.text}
                      />
                    </div>

                    {canExpand ? (
                      <button
                        type="button"
                        onClick={() => setExpandedKey(isExpanded ? null : key)}
                        aria-expanded={isExpanded}
                        title={isExpanded ? labels.collapse : labels.expand}
                        className="group flex shrink-0 cursor-pointer items-center justify-center gap-2 border-t border-neutral-100 p-4 transition-colors hover:bg-neutral-50 md:w-28 md:flex-col md:gap-0.5 md:border-l md:border-t-0"
                      >
                        <span className={`text-3xl font-bold leading-none ${accent.text}`}>
                          {entry.totalCount}
                        </span>
                        <span className="text-center text-xs text-neutral-500">
                          {requestCountLabel(
                            entry.totalCount,
                            locale,
                            labels.requestSingular,
                            labels.requestPlural,
                          )}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-neutral-400 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    ) : (
                      <div className="flex shrink-0 items-center justify-center gap-2 border-t border-neutral-100 p-4 md:w-28 md:flex-col md:gap-0.5 md:border-l md:border-t-0">
                        <span className={`text-3xl font-bold leading-none ${accent.text}`}>
                          {entry.totalCount}
                        </span>
                        <span className="text-center text-xs text-neutral-500">
                          {requestCountLabel(
                            entry.totalCount,
                            locale,
                            labels.requestSingular,
                            labels.requestPlural,
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3 md:pl-68">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        {labels.allRequests}
                      </p>
                      <ul className="space-y-3">
                        {entry.requests.map((memberRequest) => (
                          <li
                            key={memberRequest.id}
                            className="rounded-md border border-neutral-200 bg-white p-3"
                          >
                            <SpecialRequestDetails
                              request={memberRequest}
                              labels={labels}
                              dateLocale={dateLocale}
                              accentClass={accent.text}
                              compact
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
