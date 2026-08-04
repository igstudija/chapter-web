'use client'

import { useState, useMemo, useEffect } from 'react'
import { LayoutGrid, Table, Inbox } from 'lucide-react'
import Link from 'next/link'
import slugify from 'slugify'
import { TagCloud } from './TagCloud'
import { ListSearch } from './ListSearch'
import { Pagination } from './Pagination'
import { ProspectSearchLinks } from './ProspectSearchLinks'
import { useTranslations } from './TranslationsProvider'

const PAGE_SIZE_OPTIONS = [21, 50, 100] as const

interface Submitter {
  name: string
  surname: string
}

interface Top40Entry {
  id: string | number
  companyName: string
  contactPerson?: string | null
  position?: string | null
  registrationNumber?: string | null
  notes?: string | null
  businessTags?: string | null
  createdAt: string
  submittedBy?: Submitter | string | number | null
}

interface Top40GridProps {
  entries: Top40Entry[]
  /** Controls that sit at the head of the search row — e.g. the Top 40/20 switch. */
  leadingControls?: React.ReactNode
}

const STORAGE_KEY = 'top40-view-mode'

/** Only a populated relationship carries a name; an unresolved id tells us nothing. */
function resolveSubmitter(entry: Top40Entry) {
  const submitter =
    entry.submittedBy && typeof entry.submittedBy === 'object' ? entry.submittedBy : null
  if (!submitter) return null
  return {
    ...submitter,
    slug: slugify(`${submitter.name}-${submitter.surname}`, { lower: true, strict: true }),
  }
}

export function Top40Grid({ entries, leadingControls }: Top40GridProps) {
  const { t } = useTranslations()

  const buildAiSearchQuery = (entry: Top40Entry) => {
    const contact = entry.contactPerson
      ? t('top40Grid', 'aiSearchContact').replace('{name}', entry.contactPerson)
      : ''
    const position = entry.position
      ? t('top40Grid', 'aiSearchPosition').replace('{position}', entry.position)
      : ''
    const regNumber = entry.registrationNumber
      ? t('top40Grid', 'aiSearchRegNumber').replace('{number}', entry.registrationNumber)
      : ''
    return t('top40Grid', 'aiSearchQuery')
      .replace('{company}', entry.companyName)
      .replace('{contact}', contact)
      .replace('{position}', position)
      .replace('{regNumber}', regNumber)
  }

  // The saved view mode has to wait for mount. Reading localStorage in the
  // initializer hands the server one value and the browser another, and React
  // reports the hydration mismatch on every data-active attribute. The first
  // paint is always 'grid'; the saved choice applies one effect later.
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'table' || saved === 'grid') setViewMode(saved)
  }, [])

  const changeViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(PAGE_SIZE_OPTIONS[0])

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries

    const query = searchQuery.toLowerCase().trim()
    return entries.filter((entry) => {
      const submitterName =
        entry.submittedBy && typeof entry.submittedBy === 'object'
          ? `${entry.submittedBy.name} ${entry.submittedBy.surname}`.toLowerCase()
          : ''
      return (
        entry.companyName.toLowerCase().includes(query) ||
        entry.contactPerson?.toLowerCase().includes(query) ||
        entry.position?.toLowerCase().includes(query) ||
        entry.registrationNumber?.toLowerCase().includes(query) ||
        entry.notes?.toLowerCase().includes(query) ||
        entry.businessTags?.toLowerCase().includes(query) ||
        submitterName.includes(query)
      )
    })
  }, [entries, searchQuery])

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage)
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredEntries.slice(start, start + itemsPerPage)
  }, [filteredEntries, currentPage, itemsPerPage])

  const handlePageSizeChange = (size: number) => {
    setItemsPerPage(size)
    setCurrentPage(1)
  }

  // Narrowing the result set while parked on page 7 used to leave the user on
  // an empty page with no hint that anything matched.
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
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
      showLabel={t('top40Grid', 'show')}
      ofEntriesLabel={t('top40Grid', 'ofEntries')}
      totalCount={filteredEntries.length}
    />
  )

  return (
    <>
      <ListSearch
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder={t('top40Grid', 'searchPlaceholder')}
        resultCount={filteredEntries.length}
        totalCount={entries.length}
        sticky
        className="mb-5"
        leading={leadingControls}
      >
        <div className="segmented hidden lg:inline-flex">
          <button
            type="button"
            onClick={() => changeViewMode('grid')}
            className="segmented-item h-[38px] w-[38px]"
            data-active={viewMode === 'grid'}
            title={t('top40Grid', 'gridView')}
          >
            <LayoutGrid className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={() => changeViewMode('table')}
            className="segmented-item h-[38px] w-[38px]"
            data-active={viewMode === 'table'}
            title={t('top40Grid', 'tableView')}
          >
            <Table className="h-4.5 w-4.5" />
          </button>
        </div>
      </ListSearch>

      {paginatedEntries.length > 0 ? (
        <>
          <div className="mb-4">{pagination}</div>

          {/* List view — desktop only; the compact rows do not survive a phone. */}
          {viewMode === 'table' && (
            <div className="panel hidden overflow-hidden lg:block">
              {paginatedEntries.map((prospect, index) => {
                const submitter = resolveSubmitter(prospect)
                return (
                  <div key={prospect.id} className="list-row">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-baseline gap-3">
                        <span className="list-index w-8 pt-0.5">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </span>
                        <span className="text-sm font-medium break-words text-ink dark:text-surface-text">
                          {prospect.companyName}
                        </span>
                      </div>
                      <ProspectSearchLinks
                        aiQuery={buildAiSearchQuery(prospect)}
                        companyName={prospect.companyName}
                        className="shrink-0"
                      />
                    </div>

                    <div className="mt-0.5 ml-11 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-soft dark:text-neutral-400">
                      {prospect.contactPerson && <span>{prospect.contactPerson}</span>}
                      {prospect.position && (
                        <>
                          <span className="text-neutral-300 dark:text-neutral-600">·</span>
                          <span>{prospect.position}</span>
                        </>
                      )}
                      {prospect.registrationNumber && (
                        <>
                          <span className="text-neutral-300 dark:text-neutral-600">·</span>
                          <a
                            href={`https://company.lursoft.lv/en/?c=${prospect.registrationNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tabular font-mono transition-colors hover:text-brand"
                          >
                            {prospect.registrationNumber}
                          </a>
                        </>
                      )}
                      {submitter && (
                        <>
                          <span className="text-neutral-300 dark:text-neutral-600">·</span>
                          <Link
                            href={`/members/${submitter.slug}`}
                            className="transition-colors hover:text-brand"
                          >
                            {submitter.name} {submitter.surname}
                          </Link>
                        </>
                      )}
                    </div>

                    {(prospect.businessTags || prospect.notes) && (
                      <div className="mt-1.5 ml-11 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {prospect.businessTags && <TagCloud tags={prospect.businessTags} />}
                        {prospect.notes && (
                          <p className="line-clamp-1 text-xs text-neutral-400 dark:text-neutral-500">
                            {prospect.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Card view — the only view on mobile, so it renders under both modes. */}
          <div
            className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${
              viewMode === 'table' ? 'lg:hidden' : ''
            }`}
          >
            {paginatedEntries.map((prospect) => {
              const submitter = resolveSubmitter(prospect)

              return (
                <div key={prospect.id} className="panel flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-[0.9375rem] leading-snug font-semibold tracking-tight text-ink dark:text-surface-text">
                      {prospect.companyName}
                    </h3>
                    {submitter && (
                      <Link
                        href={`/members/${submitter.slug}`}
                        className="chip chip-brand shrink-0"
                        title={`${submitter.name} ${submitter.surname}`}
                      >
                        {submitter.name} {submitter.surname.charAt(0)}.
                      </Link>
                    )}
                  </div>

                  {(prospect.contactPerson || prospect.position) && (
                    <p className="mt-1 text-sm text-ink-soft dark:text-neutral-400">
                      {prospect.contactPerson}
                      {prospect.contactPerson && prospect.position && (
                        <span className="text-neutral-300 dark:text-neutral-600"> · </span>
                      )}
                      {prospect.position && (
                        <span className="text-xs">{prospect.position}</span>
                      )}
                    </p>
                  )}

                  {prospect.notes && (
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                      {prospect.notes}
                    </p>
                  )}

                  {prospect.businessTags && (
                    <TagCloud tags={prospect.businessTags} className="mt-2" />
                  )}

                  <div className="mt-auto border-t border-line pt-3 dark:border-line-dark">
                    <ProspectSearchLinks
                      aiQuery={buildAiSearchQuery(prospect)}
                      companyName={prospect.companyName}
                      registrationNumber={prospect.registrationNumber}
                      lursoftLabel={t('top40Grid', 'lursoftProfile')}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6">{pagination}</div>
        </>
      ) : (
        <div className="panel empty-state">
          <Inbox className="h-7 w-7 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
          <p className="text-sm">
            {searchQuery ? t('common', 'noResults') : t('top40Grid', 'noEntries')}
          </p>
        </div>
      )}
    </>
  )
}
