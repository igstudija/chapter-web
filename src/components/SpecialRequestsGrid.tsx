'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Mail,
  Phone,
  ExternalLink,
} from 'lucide-react'
import slugify from 'slugify'
import {
  buildMemberEntries,
  getRequester,
  requestCountLabel,
  type GroupableRequest,
} from '@/lib/specialRequestsGrouping'
import { SpecialRequestDetails } from '@/components/SpecialRequestDetails'

const PAGE_SIZE_OPTIONS = [21, 50, 100] as const

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

interface Membership {
  company?: string | null
  phone?: string | null
  profileImage?: {
    url?: string | null
    alt?: string | null
  } | string | number | null
  logo?: {
    url?: string | null
    alt?: string | null
  } | string | number | null
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
  }
  locale: string
}

export function SpecialRequestsGrid({ requests, membershipByUserId, labels, locale }: SpecialRequestsGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(PAGE_SIZE_OPTIONS[0])
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)
  const dateLocale = locale === 'lv' ? 'lv-LV' : 'en-US'

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests

    const query = searchQuery.toLowerCase().trim()
    return requests.filter((request) => {
      const requester =
        request.requestedBy && typeof request.requestedBy === 'object'
          ? request.requestedBy
          : null
      const requesterName = requester
        ? `${requester.name} ${requester.surname}`.toLowerCase()
        : ''
      const requesterId = requester?.id || (typeof request.requestedBy === 'string' ? request.requestedBy : null)
      const membership = requesterId ? membershipByUserId[String(requesterId)] : null
      const companyName = membership?.company?.toLowerCase() || ''

      return (
        request.request.toLowerCase().includes(query) ||
        requesterName.includes(query) ||
        companyName.includes(query) ||
        request.registrationNumber?.toLowerCase().includes(query)
      )
    })
  }, [requests, searchQuery, membershipByUserId])

  // One entry per member: the starred (slide) request if any, otherwise the newest one.
  // Counts and expanded contents come from ALL requests, so a member matched by name
  // still shows their full total and expands to every request they have.
  const memberEntries = useMemo(
    () => buildMemberEntries(filteredRequests, requests),
    [filteredRequests, requests],
  )

  // Pagination
  const totalPages = Math.ceil(memberEntries.length / itemsPerPage)
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return memberEntries.slice(start, start + itemsPerPage)
  }, [memberEntries, currentPage, itemsPerPage])

  const handlePageSizeChange = (size: number) => {
    setItemsPerPage(size)
    setCurrentPage(1)
  }

  const PaginationControls = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-neutral-500 dark:text-neutral-400">{labels.show}:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          className="border border-neutral-300 dark:border-neutral-600 bg-white text-ink dark:bg-surface dark:text-surface-text rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {labels.ofEntries.replace('{count}', memberEntries.length.toString())}
        </span>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (currentPage <= 3) {
              pageNum = i + 1
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = currentPage - 2 + i
            }
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-lg text-sm font-medium ${
                  currentPage === pageNum
                    ? 'bg-brand text-white'
                    : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
              >
                {pageNum}
              </button>
            )
          })}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <input
            type="text"
            placeholder={labels.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="field py-3 pl-12"
          />
        </div>
      </div>

      {/* Top Pagination */}
      <div className="mb-4">
        <PaginationControls />
      </div>

      {/* Requests List */}
      {paginatedEntries.length > 0 ? (
        <div className="space-y-4">
          {paginatedEntries.map((entry) => {
            const request = entry.displayRequest
            const requester = getRequester(request)
            const requesterMembership = membershipByUserId[entry.memberId] ?? null
            const requesterImage =
              requesterMembership?.profileImage && typeof requesterMembership.profileImage === 'object'
                ? requesterMembership.profileImage
                : null
            const requesterLogo =
              requesterMembership?.logo && typeof requesterMembership.logo === 'object' ? requesterMembership.logo : null
            const memberSlug = requester
              ? slugify(`${requester.name}-${requester.surname}`, { lower: true, strict: true })
              : null

            const isExpanded = expandedMemberId === entry.memberId
            const canExpand = entry.totalCount > 1

            return (
              <div
                key={entry.memberId}
                className="panel"
              >
              <div className="flex flex-col md:flex-row">
                {/* Left: Member Info with red accent */}
                <div className="flex items-start gap-3 p-4 md:w-72 shrink-0 border-l-4 border-brand">
                  {/* Member Image */}
                  <Link href={memberSlug ? `/members/${memberSlug}` : '#'} className="shrink-0">
                    {requesterImage?.url ? (
                      <Image
                        src={requesterImage.url}
                        alt={requester?.name || ''}
                        width={64}
                        height={64}
                        className="rounded object-cover w-16 h-16"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-brand rounded flex items-center justify-center text-white font-bold text-lg">
                        {requester?.name?.charAt(0)}
                        {requester?.surname?.charAt(0)}
                      </div>
                    )}
                  </Link>

                  {/* Member Details */}
                  <div className="min-w-0">
                    {requester && memberSlug ? (
                      <Link
                        href={`/members/${memberSlug}`}
                        className="font-semibold text-white bg-brand px-2 py-0.5 rounded text-sm inline-block hover:bg-brand/80 transition-colors"
                      >
                        {requester.name} {requester.surname}
                      </Link>
                    ) : (
                      <span className="font-semibold text-white bg-neutral-400 px-2 py-0.5 rounded text-sm inline-block">
                        {labels.unknown}
                      </span>
                    )}
                    {requesterMembership?.company && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 truncate">
                        {requesterMembership.company}
                      </p>
                    )}
                    {/* Contact Icons */}
                    <div className="flex gap-2 mt-2">
                      {requester?.email && (
                        <a
                          href={`mailto:${requester.email}`}
                          className="text-neutral-400 dark:text-neutral-500 hover:text-brand transition-colors"
                          title="Email"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      {requesterMembership?.phone && (
                        <>
                          <a
                            href={`https://wa.me/${requesterMembership.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 dark:text-neutral-500 hover:text-green-500 transition-colors"
                            title="WhatsApp"
                          >
                            <WhatsAppIcon className="h-4 w-4" />
                          </a>
                          <a
                            href={`tel:${requesterMembership.phone}`}
                            className="text-neutral-400 dark:text-neutral-500 hover:text-brand transition-colors"
                            title="Phone"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Company Logo */}
                <div className="hidden md:flex items-center justify-center w-28 shrink-0 border-r border-neutral-100 dark:border-neutral-700">
                  {requesterLogo?.url ? (
                    <div className="bg-white rounded p-2">
                      <Image
                        src={requesterLogo.url}
                        alt={requesterMembership?.company || ''}
                        width={80}
                        height={48}
                        className="object-contain max-h-12"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-12 bg-neutral-100 dark:bg-neutral-700 rounded flex items-center justify-center text-neutral-400 dark:text-neutral-500 text-xs">
                      Logo
                    </div>
                  )}
                </div>

                {/* Right: Request Content */}
                <div className="flex-1 p-4">
                  <SpecialRequestDetails
                    request={request}
                    labels={labels}
                    dateLocale={dateLocale}
                  />
                </div>

                {/* Far Right: total request count — expands the row when there is more than one */}
                {canExpand ? (
                  <button
                    type="button"
                    onClick={() => setExpandedMemberId(isExpanded ? null : entry.memberId)}
                    aria-expanded={isExpanded}
                    title={isExpanded ? labels.collapse : labels.expand}
                    className="flex md:flex-col items-center justify-center gap-2 md:gap-0.5 md:w-32 shrink-0 p-4 border-t md:border-t-0 md:border-l border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/40 transition-colors group rounded-b-lg md:rounded-b-none md:rounded-r-lg cursor-pointer"
                  >
                    <span className="text-3xl font-bold text-brand leading-none">
                      {entry.totalCount}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-brand transition-colors text-center">
                      {requestCountLabel(
                        entry.totalCount,
                        locale,
                        labels.requestSingular,
                        labels.requestPlural,
                      )}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-neutral-400 group-hover:text-brand transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                ) : (
                  <div className="flex md:flex-col items-center justify-center gap-2 md:gap-0.5 md:w-32 shrink-0 p-4 border-t md:border-t-0 md:border-l border-neutral-100 dark:border-neutral-700">
                    <span className="text-3xl font-bold text-brand leading-none">
                      {entry.totalCount}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
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

              {/* Expanded: every request this member has */}
              {isExpanded && (
                <div className="border-t border-neutral-100 dark:border-neutral-700 px-4 py-3 md:pl-76 bg-neutral-50/60 dark:bg-neutral-800/40 rounded-b-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      {labels.allRequests}
                    </p>
                    {memberSlug && (
                      <Link
                        href={`/members/${memberSlug}/special-requests`}
                        className="text-xs text-brand hover:underline inline-flex items-center gap-1"
                      >
                        {labels.viewAll}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {entry.requests.map((memberRequest) => (
                      <li
                        key={memberRequest.id}
                        className="bg-white dark:bg-surface-raised rounded-md border border-neutral-100 dark:border-neutral-700 p-3"
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
      ) : (
        <div className="text-center py-16 panel">
          <p className="text-neutral-500 dark:text-neutral-400">{labels.noRequests}</p>
        </div>
      )}

      {/* Bottom Pagination */}
      <div className="mt-6">
        <PaginationControls />
      </div>
    </>
  )
}
