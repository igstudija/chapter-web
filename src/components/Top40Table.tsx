'use client'

import { useState, useMemo, useEffect } from 'react'
import { LayoutGrid, Table, Download, Inbox } from 'lucide-react'
import * as XLSX from 'xlsx'
import { TagCloud } from './TagCloud'
import { ListSearch } from './ListSearch'
import { ProspectSearchLinks } from './ProspectSearchLinks'
import { useTranslations } from './TranslationsProvider'

interface Top40Entry {
  id: string | number
  companyName: string
  contactPerson?: string | null
  registrationNumber?: string | null
  notes?: string | null
  businessTags?: string | null
}

interface Top40TableProps {
  entries: Top40Entry[]
  memberName?: string
  /** List label used for the Excel sheet/file name (e.g. "Top 40" / "Top 20"). */
  listLabel?: string
  /**
   * What an empty list says. The default names Top 40, and this table also
   * serves the Top 20 page — without this, that page's empty state told
   * members there were "no Top 40 entries".
   */
  emptyText?: string
}

const STORAGE_KEY = 'top40-view-mode'

export function Top40Table({ entries, memberName, listLabel = 'Top 40', emptyText }: Top40TableProps) {
  const { t } = useTranslations()

  const buildAiSearchQuery = (entry: Top40Entry) => {
    const contact = entry.contactPerson
      ? t('top40Table', 'aiSearchContact').replace('{name}', entry.contactPerson)
      : ''
    const regNumber = entry.registrationNumber
      ? t('top40Table', 'aiSearchRegNumber').replace('{number}', entry.registrationNumber)
      : ''
    return t('top40Table', 'aiSearchQuery')
      .replace('{company}', entry.companyName)
      .replace('{contact}', contact)
      .replace('{regNumber}', regNumber)
  }

  const [searchQuery, setSearchQuery] = useState('')
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

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) {
      return entries
    }

    const query = searchQuery.toLowerCase().trim()

    return entries.filter(
      (entry) =>
        entry.companyName.toLowerCase().includes(query) ||
        entry.contactPerson?.toLowerCase().includes(query) ||
        entry.registrationNumber?.toLowerCase().includes(query) ||
        entry.notes?.toLowerCase().includes(query) ||
        entry.businessTags?.toLowerCase().includes(query),
    )
  }, [entries, searchQuery])

  const handleExportToExcel = () => {
    const exportData = filteredEntries.map((entry, index) => ({
      '#': index + 1,
      [t('top40Table', 'excelCompany')]: entry.companyName,
      [t('top40Table', 'excelContact')]: entry.contactPerson,
      [t('top40Table', 'excelRegNumber')]: entry.registrationNumber || '',
      [t('top40Table', 'excelDescription')]: entry.notes || '',
      [t('top40Table', 'excelTags')]: entry.businessTags || '',
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, listLabel)

    const date = new Date().toISOString().split('T')[0]
    const filePrefix = listLabel.replace(/\s+/g, '')
    const filename = memberName
      ? `${filePrefix}_${memberName.replace(/\s+/g, '_')}_${date}.xlsx`
      : `${filePrefix}_${date}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  return (
    <>
      <ListSearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={t('top40Table', 'searchPlaceholder')}
        resultCount={filteredEntries.length}
        totalCount={entries.length}
        sticky
        className="mb-5"
      >
        <button
          type="button"
          onClick={handleExportToExcel}
          className="btn btn-line h-[38px] px-3 text-sm"
          title={t('top40Table', 'exportExcel')}
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Excel</span>
        </button>
        <div className="segmented hidden lg:inline-flex">
          <button
            type="button"
            onClick={() => changeViewMode('grid')}
            className="segmented-item h-[38px] w-[38px]"
            data-active={viewMode === 'grid'}
            title={t('top40Table', 'gridView')}
          >
            <LayoutGrid className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={() => changeViewMode('table')}
            className="segmented-item h-[38px] w-[38px]"
            data-active={viewMode === 'table'}
            title={t('top40Table', 'tableView')}
          >
            <Table className="h-4.5 w-4.5" />
          </button>
        </div>
      </ListSearch>

      {filteredEntries.length > 0 ? (
        <>
          {/* List view — desktop only. */}
          {viewMode === 'table' && (
            <div className="panel hidden overflow-hidden lg:block">
              {filteredEntries.map((entry, index) => (
                <div key={entry.id} className="list-row">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-baseline gap-3">
                      <span className="list-index w-6 pt-0.5">{index + 1}</span>
                      <span className="text-sm font-medium break-words text-ink dark:text-surface-text">
                        {entry.companyName}
                      </span>
                    </div>
                    <ProspectSearchLinks
                      aiQuery={buildAiSearchQuery(entry)}
                      companyName={entry.companyName}
                      className="shrink-0"
                    />
                  </div>

                  {(entry.contactPerson || entry.registrationNumber) && (
                    <div className="mt-0.5 ml-9 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-soft dark:text-neutral-400">
                      {entry.contactPerson && <span>{entry.contactPerson}</span>}
                      {entry.registrationNumber && (
                        <>
                          {entry.contactPerson && (
                            <span className="text-neutral-300 dark:text-neutral-600">·</span>
                          )}
                          <a
                            href={`https://company.lursoft.lv/en/?c=${entry.registrationNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tabular font-mono transition-colors hover:text-brand"
                          >
                            {entry.registrationNumber}
                          </a>
                        </>
                      )}
                    </div>
                  )}

                  {(entry.businessTags || entry.notes) && (
                    <div className="mt-1.5 ml-9 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {entry.businessTags && <TagCloud tags={entry.businessTags} />}
                      {entry.notes && (
                        <p className="line-clamp-1 text-xs text-neutral-400 dark:text-neutral-500">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Card view — the only view on mobile, so it renders under both modes. */}
          <div
            className={`grid gap-4 md:grid-cols-2 ${
              viewMode === 'table' ? 'lg:hidden' : 'lg:grid-cols-3'
            }`}
          >
            {filteredEntries.map((entry, index) => (
              <div key={entry.id} className="panel flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-[0.9375rem] leading-snug font-semibold tracking-tight text-ink dark:text-surface-text">
                    {entry.companyName}
                  </h3>
                  <span className="list-index pt-1">{index + 1}</span>
                </div>

                {entry.contactPerson && (
                  <p className="mt-1 text-sm text-ink-soft dark:text-neutral-400">
                    {entry.contactPerson}
                  </p>
                )}

                {entry.notes && (
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                    {entry.notes}
                  </p>
                )}

                {entry.businessTags && <TagCloud tags={entry.businessTags} className="mt-2" />}

                <div className="mt-auto border-t border-line pt-3 dark:border-line-dark">
                  <ProspectSearchLinks
                    aiQuery={buildAiSearchQuery(entry)}
                    companyName={entry.companyName}
                    registrationNumber={entry.registrationNumber}
                    lursoftLabel={t('top40Grid', 'lursoftProfile')}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="panel empty-state">
          <Inbox className="h-7 w-7 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
          <p className="text-sm">
            {searchQuery ? t('top40Table', 'noResultsSearch') : (emptyText ?? t('top40Table', 'noEntries'))}
          </p>
        </div>
      )}
    </>
  )
}
