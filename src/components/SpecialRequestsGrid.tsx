'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, Mail, Phone, ExternalLink, Inbox } from 'lucide-react'
import slugify from 'slugify'
import {
  buildMemberEntries,
  getRequester,
  requestCountLabel,
  type GroupableRequest,
} from '@/lib/specialRequestsGrouping'
import { CompanyLogo } from '@/components/CompanyLogo'
import { SpecialRequestDetails } from '@/components/SpecialRequestDetails'
import { ListSearch } from '@/components/ListSearch'
import { Pagination } from '@/components/Pagination'

const PAGE_SIZE_OPTIONS = [21, 50, 100] as const

/** The filter value meaning "do not narrow by chapter". */
const ALL_CHAPTERS = '__all__'

/**
 * Which chapter a row belongs to. Rows that arrived over a link carry the
 * chapter they came from; ours carry nothing, so they answer to this chapter's
 * own name.
 */
const chapterOf = (request: GroupableRequest, ourChapterName?: string) =>
  request.chapterName || ourChapterName || ''

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

interface Membership {
  company?: string | null
  phone?: string | null
  profileImage?:
    | {
        url?: string | null
        alt?: string | null
      }
    | string
    | number
    | null
  logo?:
    | {
        url?: string | null
        alt?: string | null
      }
    | string
    | number
    | null
}

type SpecialRequest = GroupableRequest

interface SpecialRequestsGridProps {
  requests: SpecialRequest[]
  membershipByUserId: Record<string, Membership>
  labels: {
    searchPlaceholder: string
    show: string
    ofEntries: string
    noRequests: string
    unknown: string
    added: string
    updated: string
    regNumber: string
    requestSingular: string
    requestPlural: string
    viewAll: string
    expand: string
    collapse: string
    allRequests: string
    allChapters: string
  }
  locale: string
  /** This chapter's own name, used to label our rows in the chapter filter. */
  ourChapterName?: string
}

export function SpecialRequestsGrid({
  requests,
  membershipByUserId,
  labels,
  locale,
  ourChapterName,
}: SpecialRequestsGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [chapter, setChapter] = useState<string>(ALL_CHAPTERS)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(PAGE_SIZE_OPTIONS[0])
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)
  const dateLocale = locale === 'lv' ? 'lv-LV' : 'en-US'

  const chapters = useMemo(() => {
    const names = new Set<string>()
    for (const request of requests) {
      const name = chapterOf(request, ourChapterName)
      if (name) names.add(name)
    }
    return [...names].sort()
  }, [requests, ourChapterName])

  const inChapter = useMemo(
    () =>
      chapter === ALL_CHAPTERS
        ? requests
        : requests.filter((r) => chapterOf(r, ourChapterName) === chapter),
    [requests, chapter, ourChapterName],
  )

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return inChapter

    const query = searchQuery.toLowerCase().trim()
    return inChapter.filter((request) => {
      const requester =
        request.requestedBy && typeof request.requestedBy === 'object' ? request.requestedBy : null
      const requesterName = requester ? `${requester.name} ${requester.surname}`.toLowerCase() : ''
      const requesterId =
        requester?.id || (typeof request.requestedBy === 'string' ? request.requestedBy : null)
      const membership = requesterId ? membershipByUserId[String(requesterId)] : null
      const companyName = membership?.company?.toLowerCase() || ''

      return (
        request.request.toLowerCase().includes(query) ||
        requesterName.includes(query) ||
        companyName.includes(query) ||
        request.registrationNumber?.toLowerCase().includes(query)
      )
    })
  }, [inChapter, searchQuery, membershipByUserId])

  // One entry per member: the starred (slide) request if any, otherwise the newest one.
  // Counts and expanded contents come from ALL requests, so a member matched by name
  // still shows their full total and expands to every request they have.
  const memberEntries = useMemo(
    () => buildMemberEntries(filteredRequests, inChapter),
    [filteredRequests, inChapter],
  )
  const totalMemberCount = useMemo(
    () => buildMemberEntries(inChapter, inChapter).length,
    [inChapter],
  )

  const totalPages = Math.ceil(memberEntries.length / itemsPerPage)
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return memberEntries.slice(start, start + itemsPerPage)
  }, [memberEntries, currentPage, itemsPerPage])

  const handlePageSizeChange = (size: number) => {
    setItemsPerPage(size)
    setCurrentPage(1)
  }

  const pagination = (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
      pageSize={itemsPerPage}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      onPageSizeChange={handlePageSizeChange}
      showLabel={labels.show}
      ofEntriesLabel={labels.ofEntries}
      totalCount={memberEntries.length}
    />
  )

  return (
    <>
      <ListSearch
        value={searchQuery}
        onChange={(value) => {
          setSearchQuery(value)
          setCurrentPage(1)
        }}
        placeholder={labels.searchPlaceholder}
        resultCount={memberEntries.length}
        totalCount={totalMemberCount}
        sticky
        className="mb-5"
      />

      {/* Only worth showing once this install is actually linked to somewhere.
          One chapter means one option, which is not a choice. */}
      {chapters.length > 1 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setChapter(ALL_CHAPTERS)
              setCurrentPage(1)
            }}
            aria-pressed={chapter === ALL_CHAPTERS}
            className={
              chapter === ALL_CHAPTERS
                ? 'btn btn-primary px-3 py-1.5 text-sm'
                : 'btn px-3 py-1.5 text-sm'
            }
          >
            {labels.allChapters}
          </button>
          {chapters.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setChapter(name)
                setCurrentPage(1)
              }}
              aria-pressed={chapter === name}
              className={
                chapter === name
                  ? 'btn btn-primary px-3 py-1.5 text-sm'
                  : 'btn px-3 py-1.5 text-sm'
              }
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {paginatedEntries.length > 0 ? (
        <>
          <div className="mb-4">{pagination}</div>

          <div className="space-y-3">
            {paginatedEntries.map((entry) => {
              const request = entry.displayRequest
              const requester = getRequester(request)
              const requesterMembership = membershipByUserId[entry.memberId] ?? null
              const requesterImage =
                requesterMembership?.profileImage &&
                typeof requesterMembership.profileImage === 'object'
                  ? requesterMembership.profileImage
                  : null
              const requesterLogo =
                requesterMembership?.logo && typeof requesterMembership.logo === 'object'
                  ? requesterMembership.logo
                  : null
              const memberSlug = requester
                ? slugify(`${requester.name}-${requester.surname}`, { lower: true, strict: true })
                : null

              const isExpanded = expandedMemberId === entry.memberId
              const canExpand = entry.totalCount > 1

              return (
                <div key={entry.memberId} className="panel overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {/* Who is asking. The brand rule on the left edge marks the row
                        without painting a red block behind the person's name. */}
                    <div className="flex shrink-0 items-start gap-3 border-l-2 border-brand p-4 md:w-72">
                      <Link
                        href={memberSlug ? `/members/${memberSlug}` : '#'}
                        className="shrink-0"
                        aria-label={requester ? `${requester.name} ${requester.surname}` : undefined}
                      >
                        {requesterImage?.url ? (
                          <Image
                            src={requesterImage.url}
                            alt={requester?.name || ''}
                            width={56}
                            height={56}
                            className="h-14 w-14 rounded-full object-cover ring-1 ring-line dark:ring-line-dark"
                          />
                        ) : (
                          <div className="tabular flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 font-display text-sm font-bold text-brand ring-1 ring-brand/25">
                            {requester?.name?.charAt(0)}
                            {requester?.surname?.charAt(0)}
                          </div>
                        )}
                      </Link>

                      <div className="min-w-0">
                        {requester && memberSlug ? (
                          <Link
                            href={`/members/${memberSlug}`}
                            className="font-display text-sm font-semibold tracking-tight text-ink transition-colors hover:text-brand dark:text-surface-text"
                          >
                            {requester.name} {requester.surname}
                          </Link>
                        ) : (
                          <span className="font-display text-sm font-semibold tracking-tight text-neutral-400">
                            {labels.unknown}
                          </span>
                        )}
                        {requesterMembership?.company && (
                          <p className="mt-0.5 truncate text-xs text-ink-soft dark:text-neutral-400">
                            {requesterMembership.company}
                          </p>
                        )}

                        {/* Only on rows from elsewhere. Marking our own would
                            put a label on every card and tell nobody anything. */}
                        {entry.displayRequest.chapterName && (
                          <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-ink-soft dark:bg-neutral-800 dark:text-neutral-400">
                            {entry.displayRequest.chapterName}
                          </span>
                        )}

                        <div className="mt-2 -ml-1.5 flex gap-0.5">
                          {requester?.email && (
                            <a
                              href={`mailto:${requester.email}`}
                              className="icon-btn icon-btn-brand h-7 w-7"
                              title="Email"
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {requesterMembership?.phone && (
                            <>
                              <a
                                href={`https://wa.me/${requesterMembership.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="icon-btn h-7 w-7 hover:!bg-[#25d366]/12 hover:!text-[#25d366]"
                                title="WhatsApp"
                              >
                                <WhatsAppIcon className="h-3.5 w-3.5" />
                              </a>
                              <a
                                href={`tel:${requesterMembership.phone}`}
                                className="icon-btn icon-btn-brand h-7 w-7"
                                title="Phone"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Company mark. A member without a logo used to get a grey box
                        with the word "Logo" in it — an empty slot, announced. */}
                    {requesterLogo?.url && (
                      <div className="hidden w-24 shrink-0 items-center justify-center border-r border-line md:flex dark:border-line-dark">
                        {/* Company logos are drawn for white paper — a black
                            wordmark on the dark surface is an empty cell. The
                            plate keeps them legible in both themes. */}
                        <div className="rounded-md bg-white p-1.5">
                          <CompanyLogo
                            src={requesterLogo.url}
                            alt={requesterMembership?.company || ''}
                            width={72}
                            height={40}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex-1 p-4">
                      <SpecialRequestDetails
                        request={request}
                        labels={labels}
                        dateLocale={dateLocale}
                      />
                    </div>

                    {/* How many this member has — expands the row when there is more than one. */}
                    {canExpand ? (
                      <button
                        type="button"
                        onClick={() => setExpandedMemberId(isExpanded ? null : entry.memberId)}
                        aria-expanded={isExpanded}
                        title={isExpanded ? labels.collapse : labels.expand}
                        className="group flex shrink-0 cursor-pointer items-center justify-center gap-2 border-t border-line p-4 transition-colors hover:bg-brand/4 md:w-28 md:flex-col md:gap-0.5 md:border-t-0 md:border-l dark:border-line-dark dark:hover:bg-brand/8"
                      >
                        <span className="stat-figure text-3xl leading-none">{entry.totalCount}</span>
                        <span className="eyebrow text-center">
                          {requestCountLabel(
                            entry.totalCount,
                            locale,
                            labels.requestSingular,
                            labels.requestPlural,
                          )}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-neutral-400 transition-transform group-hover:text-brand ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    ) : (
                      <div className="flex shrink-0 items-center justify-center gap-2 border-t border-line p-4 md:w-28 md:flex-col md:gap-0.5 md:border-t-0 md:border-l dark:border-line-dark">
                        <span className="stat-figure text-3xl leading-none">{entry.totalCount}</span>
                        <span className="eyebrow text-center">
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
                    <div className="border-t border-line bg-paper/70 px-4 py-3 dark:border-line-dark dark:bg-surface/40">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="eyebrow">{labels.allRequests}</p>
                        {memberSlug && (
                          <Link
                            href={`/members/${memberSlug}/special-requests`}
                            className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                          >
                            {labels.viewAll}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                      <ul className="space-y-2">
                        {entry.requests.map((memberRequest) => (
                          <li
                            key={memberRequest.id}
                            className="rounded-lg border border-line bg-card p-3 dark:border-line-dark dark:bg-surface-raised"
                          >
                            <SpecialRequestDetails
                              request={memberRequest}
                              labels={labels}
                              dateLocale={dateLocale}
                              compact
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-6">{pagination}</div>
        </>
      ) : (
        <div className="panel empty-state">
          <Inbox className="h-7 w-7 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
          <p className="text-sm">{labels.noRequests}</p>
        </div>
      )}
    </>
  )
}
