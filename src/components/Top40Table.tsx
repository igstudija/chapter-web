'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, LayoutGrid, Table, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { TagCloud } from './TagCloud'
import { useTranslations } from './TranslationsProvider'

function ChatGPTIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4091-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

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
}

const STORAGE_KEY = 'top40-view-mode'

export function Top40Table({ entries, memberName, listLabel = 'Top 40' }: Top40TableProps) {
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'table' || saved === 'grid') return saved
    }
    return 'grid'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode)
  }, [viewMode])

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
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <input
            type="text"
            placeholder={t('top40Table', 'searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-neutral-300 dark:border-neutral-600 bg-white text-ink dark:bg-surface dark:text-surface-text rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none"
          />
        </div>
        <button
          onClick={handleExportToExcel}
          className="flex items-center gap-2 px-4 h-[46px] bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          title={t('top40Table', 'exportExcel')}
        >
          <Download className="h-5 w-5" />
          <span className="hidden sm:inline">Excel</span>
        </button>
        <div className="hidden lg:flex rounded-lg border border-neutral-300 dark:border-neutral-600 overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center justify-center w-[46px] h-[46px] ${viewMode === 'grid' ? 'bg-brand text-white' : 'bg-white dark:bg-surface text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
            title={t('top40Table', 'gridView')}
          >
            <LayoutGrid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center justify-center w-[46px] h-[46px] ${viewMode === 'table' ? 'bg-brand text-white' : 'bg-white dark:bg-surface text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
            title={t('top40Table', 'tableView')}
          >
            <Table className="h-5 w-5" />
          </button>
        </div>
      </div>

      {filteredEntries.length > 0 ? (
        <>
          {/* List View */}
          {viewMode === 'table' && (
            <div className="hidden lg:block bg-white dark:bg-neutral-800 rounded-lg shadow-sm overflow-hidden">
              {filteredEntries.map((entry, index) => (
                <div key={entry.id} className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                  {/* Row 1: number + company + search icons */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-sm text-neutral-400 dark:text-neutral-500 font-medium shrink-0 pt-0.5 w-6 text-right">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-ink dark:text-surface-text break-words">
                        {entry.companyName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`https://www.perplexity.ai/search?q=${encodeURIComponent(buildAiSearchQuery(entry))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-[#20808D] hover:text-white text-neutral-600 dark:text-neutral-300 transition-colors"
                        title="Perplexity"
                      >
                        <img
                          src="https://api.iconify.design/ri:perplexity-fill.svg"
                          alt=""
                          className="h-3.5 w-3.5 dark:invert"
                        />
                      </a>
                      <a
                        href={`https://chatgpt.com/?q=${encodeURIComponent(buildAiSearchQuery(entry))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-[#10a37f] hover:text-white text-neutral-600 dark:text-neutral-300 transition-colors"
                        title="ChatGPT"
                      >
                        <ChatGPTIcon className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(`"${entry.companyName}"`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-[#4285f4] hover:text-white text-neutral-600 dark:text-neutral-300 transition-colors"
                        title="Google"
                      >
                        <GoogleIcon className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                  {/* Row 2: details */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 ml-9 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    <span>{entry.contactPerson}</span>
                    {entry.registrationNumber && (
                      <>
                        <span className="text-neutral-300 dark:text-neutral-600">·</span>
                        <span>{entry.registrationNumber}</span>
                      </>
                    )}
                  </div>
                  {/* Row 3: tags + notes */}
                  {(entry.businessTags || entry.notes) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ml-9 mt-1.5">
                      {entry.businessTags && (
                        <TagCloud tags={entry.businessTags} />
                      )}
                      {entry.notes && (
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 italic line-clamp-1">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Grid View - always on mobile, conditional on desktop */}
          <div
            className={`grid gap-4 md:grid-cols-2 ${viewMode === 'table' ? 'lg:hidden' : 'lg:grid-cols-3'}`}
          >
            {filteredEntries.map((entry, index) => (
              <div
                key={entry.id}
                className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-4 border border-neutral-200 dark:border-neutral-600 hover:border-brand transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    #{index + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-ink dark:text-surface-text">
                  {entry.companyName}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  {entry.contactPerson}
                </p>
                {entry.notes && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 italic line-clamp-3">
                    {entry.notes}
                  </p>
                )}
                {entry.businessTags && (
                  <TagCloud tags={entry.businessTags} className="mt-1.5" />
                )}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                  <a
                    href={`https://www.perplexity.ai/search?q=${encodeURIComponent(buildAiSearchQuery(entry))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-[#20808D] hover:text-white text-neutral-600 dark:text-neutral-300 transition-colors"
                    title="Perplexity"
                  >
                    <img
                      src="https://api.iconify.design/ri:perplexity-fill.svg"
                      alt=""
                      className="h-3.5 w-3.5 dark:invert"
                    />
                  </a>
                  <a
                    href={`https://chatgpt.com/?q=${encodeURIComponent(buildAiSearchQuery(entry))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-[#10a37f] hover:text-white text-neutral-600 dark:text-neutral-300 transition-colors"
                    title="ChatGPT"
                  >
                    <ChatGPTIcon className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(`"${entry.companyName}"`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-[#4285f4] hover:text-white text-neutral-600 dark:text-neutral-300 transition-colors"
                    title="Google"
                  >
                    <GoogleIcon className="h-3.5 w-3.5" />
                  </a>
                  {entry.registrationNumber && (
                    <a
                      href={`https://company.lursoft.lv/en/?c=${entry.registrationNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-xs text-brand hover:underline"
                      title="Lursoft profils"
                    >
                      {entry.registrationNumber}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
          {searchQuery ? t('top40Table', 'noResultsSearch') : t('top40Table', 'noEntries')}
        </p>
      )}
    </>
  )
}
