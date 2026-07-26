'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  LayoutGrid,
  Table,
  Pencil,
  Trash2,
  Upload,
  Download,
  HelpCircle,
  X,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { Top40Modal } from './Top40Modal'
import { Top40ImportModal, type ImportedEntry } from './Top40ImportModal'
import { Top40EntryRow } from './Top40EntryRow'
import { TagCloud } from './TagCloud'
import { ConfirmDialog } from './ConfirmDialog'
import { useTranslations } from './TranslationsProvider'

export interface ProspectEntry {
  id: string | number
  companyName: string
  contactPerson?: string | null
  position?: string | null
  registrationNumber?: string | null
  notes?: string | null
  businessTags?: string | null
  createdAt: string
}

interface ProspectListSectionProps {
  /** API base for create/update/delete (e.g. '/api/top40' or '/api/top20'). */
  apiBase: string
  entries: ReadonlyArray<ProspectEntry>
  siteId?: string | number
  /** Section header (e.g. "MY TOP 40"). */
  heading: string
  /** Empty-state text when there are no entries at all. */
  emptyText: string
  /** localStorage key for the grid/table view preference. */
  viewModeStorageKey: string
  /** Excel export file name prefix + sheet name. */
  exportFileNamePrefix: string
  sheetName: string
  /** Modal title overrides for the create/edit form. */
  modalAddTitle: string
  modalEditTitle: string
  /** Short list label (e.g. "Top 40" / "Top 20") used in import/help titles. */
  listLabel: string
  /** Whether the contact person field is required in the add/edit form. */
  requireContactPerson?: boolean
}

export function ProspectListSection({
  apiBase,
  entries,
  siteId,
  heading,
  emptyText,
  viewModeStorageKey,
  exportFileNamePrefix,
  sheetName,
  modalAddTitle,
  modalEditTitle,
  listLabel,
  requireContactPerson = true,
}: ProspectListSectionProps) {
  const router = useRouter()
  const { t } = useTranslations()
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showImportHelp, setShowImportHelp] = useState(false)
  const [editEntry, setEditEntry] = useState<ProspectEntry | null>(null)
  const [deleting, setDeleting] = useState<string | number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    if (globalThis.window !== undefined) {
      const saved = globalThis.localStorage.getItem(viewModeStorageKey)
      if (saved === 'table' || saved === 'grid') return saved
    }
    return 'grid'
  })

  useEffect(() => {
    globalThis.localStorage.setItem(viewModeStorageKey, viewMode)
  }, [viewMode, viewModeStorageKey])

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries
    const query = search.toLowerCase().trim()
    return entries.filter(
      (entry) =>
        entry.companyName.toLowerCase().includes(query) ||
        entry.contactPerson?.toLowerCase().includes(query) ||
        entry.registrationNumber?.toLowerCase().includes(query) ||
        entry.businessTags?.toLowerCase().includes(query),
    )
  }, [entries, search])

  const handleExport = () => {
    const exportData = filteredEntries.map((entry, index) => ({
      '#': index + 1,
      [t('top40', 'tableCompany')]: entry.companyName,
      [t('top40', 'tableContact')]: entry.contactPerson,
      [t('top40', 'tablePosition')]: entry.position || '',
      [t('top40', 'tableRegNumber')]: entry.registrationNumber || '',
      [t('top40', 'tableAdded')]: entry.createdAt
        ? new Date(entry.createdAt).toLocaleDateString('lv-LV')
        : '',
      [t('top40', 'notes')]: entry.notes || '',
      [t('top40', 'tags')]: entry.businessTags || '',
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    const date = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `${exportFileNamePrefix}_${date}.xlsx`)
  }

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        [t('top40', 'companyName')]: 'SIA Piemērs',
        [t('top40', 'contactPerson')]: 'Jānis Bērziņš',
        [t('top40', 'position')]: 'Direktors',
        [t('top40', 'regNumber')]: '40001234567',
        [t('top40', 'notes')]: 'IT pakalpojumi',
        [t('top40', 'tags')]: 'IT, programmatūra',
      },
      {
        [t('top40', 'companyName')]: 'SIA Kompānija',
        [t('top40', 'contactPerson')]: 'Anna Kalniņa',
        [t('top40', 'position')]: 'Vadītāja',
        [t('top40', 'regNumber')]: '40007654321',
        [t('top40', 'notes')]: 'Mārketings',
        [t('top40', 'tags')]: 'mārketings, reklāma',
      },
    ]
    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `${exportFileNamePrefix}_template.xlsx`)
  }

  const executeDelete = async () => {
    if (confirmDeleteId === null) return
    setDeleting(confirmDeleteId)
    try {
      await fetch(`${apiBase}/${confirmDeleteId}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setDeleting(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold tracking-tight text-ink dark:text-surface-text">{heading}</h2>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-4 h-10 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
              title={t('top40Table', 'exportExcel')}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center justify-center gap-2 px-4 h-10 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors text-sm font-medium"
            title={t('common', 'import')}
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common', 'import')}</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center w-10 h-10 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors"
          >
            <span className="text-xl">+</span>
          </button>
          <button
            onClick={() => setShowImportHelp(true)}
            className="flex items-center justify-center w-10 h-10 bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
            title={t('top40Import', 'helpBtnTitle')}
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <input
            type="text"
            placeholder={t('common', 'searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field py-3 pl-12"
          />
        </div>
        <div className="hidden lg:flex rounded-lg border border-neutral-300 dark:border-neutral-600 overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center justify-center w-[46px] h-[46px] ${viewMode === 'grid' ? 'bg-brand text-white' : 'bg-white dark:bg-surface text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
            title={t('common', 'gridView')}
          >
            <LayoutGrid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center justify-center w-[46px] h-[46px] ${viewMode === 'table' ? 'bg-brand text-white' : 'bg-white dark:bg-surface text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
            title={t('common', 'tableView')}
          >
            <Table className="h-5 w-5" />
          </button>
        </div>
      </div>

      {filteredEntries.length > 0 ? (
        <>
          {viewMode === 'table' && (
            <div className="hidden lg:block panel overflow-hidden">
              {filteredEntries.map((entry, index) => (
                <Top40EntryRow
                  key={entry.id}
                  entry={entry}
                  index={index}
                  showActions={true}
                  onEdit={(e) => {
                    setEditEntry(e as ProspectEntry)
                    setShowModal(true)
                  }}
                  onDelete={(id) => setConfirmDeleteId(id)}
                  isDeleting={deleting === entry.id}
                />
              ))}
            </div>
          )}

          <div
            className={`grid gap-4 md:grid-cols-2 ${viewMode === 'table' ? 'lg:hidden' : 'lg:grid-cols-3'}`}
          >
            {filteredEntries.map((entry, index) => (
              <div
                key={entry.id}
                className="card-surface p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    #{index + 1}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditEntry(entry)
                        setShowModal(true)
                      }}
                      className="p-1.5 border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors"
                      title={t('common', 'edit')}
                    >
                      <Pencil className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(entry.id)}
                      disabled={deleting === entry.id}
                      className="p-1.5 border border-neutral-300 dark:border-neutral-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                      title={t('common', 'delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-500" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-ink dark:text-surface-text">
                  {entry.companyName}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  {entry.contactPerson}
                </p>
                {entry.position && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{entry.position}</p>
                )}
                {entry.notes && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 italic line-clamp-3">
                    {entry.notes}
                  </p>
                )}
                {entry.businessTags && <TagCloud tags={entry.businessTags} className="mt-1.5" />}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                  {entry.registrationNumber && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {entry.registrationNumber}
                    </span>
                  )}
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-auto">
                    {new Date(entry.createdAt).toLocaleDateString('lv-LV')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
          {search ? t('top40', 'noEntries') : emptyText}
        </p>
      )}

      <Top40Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditEntry(null)
        }}
        editData={editEntry}
        siteId={siteId}
        apiBase={apiBase}
        addTitle={modalAddTitle}
        editTitle={modalEditTitle}
        requireContactPerson={requireContactPerson}
      />
      <Top40ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title={t('top40Import', 'title').replace('{label}', listLabel)}
        onImport={async (imported: ImportedEntry[]) => {
          const errors: string[] = []
          for (const entry of imported) {
            const res = await fetch(apiBase, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                companyName: entry.companyName,
                contactPerson: entry.contactPerson,
                position: entry.position || '',
                registrationNumber: entry.registrationNumber || '',
                notes: entry.notes || '',
                businessTags: entry.businessTags || '',
              }),
            })
            if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              errors.push(data.error || `Failed to import ${entry.companyName}`)
            }
          }
          if (errors.length > 0) throw new Error(errors[0])
          router.refresh()
        }}
      />
      {showImportHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-neutral-950/55 backdrop-blur-sm"
            onClick={() => setShowImportHelp(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowImportHelp(false)
            }}
            role="button"
            tabIndex={-1}
            aria-label={t('common', 'close')}
          />
          <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <button
              onClick={() => setShowImportHelp(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display mb-3 text-lg font-bold tracking-tight text-ink dark:text-surface-text">
              {t('top40Import', 'helpTitle').replace('{label}', listLabel)}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              {t('top40Import', 'helpDescription')}
            </p>
            <ul className="space-y-2 mb-4 text-sm text-neutral-700 dark:text-neutral-300">
              <li className="flex gap-2"><span className="text-brand font-bold">•</span>{t('top40Import', 'helpColumnCompany')}</li>
              <li className="flex gap-2"><span className="text-neutral-400 font-bold">•</span>{t('top40Import', 'helpColumnContact')}</li>
              <li className="flex gap-2"><span className="text-neutral-400 font-bold">•</span>{t('top40Import', 'helpColumnPosition')}</li>
              <li className="flex gap-2"><span className="text-neutral-400 font-bold">•</span>{t('top40Import', 'helpColumnRegNumber')}</li>
              <li className="flex gap-2"><span className="text-neutral-400 font-bold">•</span>{t('top40Import', 'helpColumnNotes')}</li>
              <li className="flex gap-2"><span className="text-neutral-400 font-bold">•</span>{t('top40Import', 'helpColumnTags')}</li>
            </ul>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
              {t('top40Import', 'helpAutoDetect')}
            </p>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-4">
              {t('top40Import', 'helpRequiredNote')}
            </p>
            <button
              onClick={() => {
                handleDownloadTemplate()
                setShowImportHelp(false)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              {t('top40Import', 'downloadTemplate')}
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={executeDelete}
        title={t('common', 'confirmDelete')}
        message={t('top40', 'confirmDeleteMessage')}
        loading={!!deleting}
      />
    </>
  )
}
