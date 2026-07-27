'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutGrid,
  Table,
  Pencil,
  Trash2,
  Upload,
  Download,
  HelpCircle,
  Plus,
  Inbox,
  X,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { Top40Modal } from './Top40Modal'
import { Top40ImportModal, type ImportedEntry } from './Top40ImportModal'
import { Top40EntryRow } from './Top40EntryRow'
import { TagCloud } from './TagCloud'
import { ListSearch } from './ListSearch'
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
      {/* Header actions. Four buttons in four different styles — a grey block, a
          red square with a text "+", another grey block — read as four unrelated
          controls. One primary action, the rest outlined, and the count of what
          you have sits with the heading where it belongs. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink dark:text-surface-text">
            {heading}
          </h2>
          <span className="tabular font-mono text-sm text-brand">{entries.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <button
              type="button"
              onClick={handleExport}
              className="btn btn-line h-9 px-3 text-sm"
              title={t('top40Table', 'exportExcel')}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="btn btn-line h-9 px-3 text-sm"
            title={t('common', 'import')}
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common', 'import')}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowImportHelp(true)}
            className="icon-btn h-9 w-9"
            title={t('top40Import', 'helpBtnTitle')}
            aria-label={t('top40Import', 'helpBtnTitle')}
          >
            <HelpCircle className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn btn-primary h-9 px-3 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common', 'add')}</span>
          </button>
        </div>
      </div>

      <ListSearch
        value={search}
        onChange={setSearch}
        placeholder={t('common', 'searchPlaceholder')}
        resultCount={filteredEntries.length}
        totalCount={entries.length}
        sticky
        className="mb-4"
      >
        <div className="segmented hidden lg:inline-flex">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className="segmented-item h-[38px] w-[38px]"
            data-active={viewMode === 'grid'}
            title={t('common', 'gridView')}
          >
            <LayoutGrid className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className="segmented-item h-[38px] w-[38px]"
            data-active={viewMode === 'table'}
            title={t('common', 'tableView')}
          >
            <Table className="h-4.5 w-4.5" />
          </button>
        </div>
      </ListSearch>

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
              <div key={entry.id} className="group panel flex flex-col p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h3 className="font-display text-[0.9375rem] leading-snug font-semibold tracking-tight text-ink dark:text-surface-text">
                    {entry.companyName}
                  </h3>
                  {/* The row actions stay out of the way until the card is
                      pointed at; keyboard focus brings them back. */}
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        setEditEntry(entry)
                        setShowModal(true)
                      }}
                      className="icon-btn icon-btn-brand"
                      title={t('common', 'edit')}
                      aria-label={t('common', 'edit')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(entry.id)}
                      disabled={deleting === entry.id}
                      className="icon-btn icon-btn-danger"
                      title={t('common', 'delete')}
                      aria-label={t('common', 'delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {(entry.contactPerson || entry.position) && (
                  <p className="text-sm text-ink-soft dark:text-neutral-400">
                    {entry.contactPerson}
                    {entry.contactPerson && entry.position && (
                      <span className="text-neutral-300 dark:text-neutral-600"> · </span>
                    )}
                    {entry.position && <span className="text-xs">{entry.position}</span>}
                  </p>
                )}
                {entry.notes && (
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                    {entry.notes}
                  </p>
                )}
                {entry.businessTags && <TagCloud tags={entry.businessTags} className="mt-2" />}
                <div className="mt-auto flex items-center gap-2 border-t border-line pt-3 dark:border-line-dark">
                  <span className="list-index">{index + 1}</span>
                  {entry.registrationNumber && (
                    <span className="tabular font-mono text-[11px] text-ink-soft dark:text-neutral-400">
                      {entry.registrationNumber}
                    </span>
                  )}
                  <span className="tabular ml-auto font-mono text-[11px] text-neutral-400 dark:text-neutral-500">
                    {new Date(entry.createdAt).toLocaleDateString('lv-LV')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="panel empty-state">
          <Inbox className="h-7 w-7 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
          <p className="text-sm">{search ? t('top40', 'noEntries') : emptyText}</p>
        </div>
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
        // Was a bespoke overlay with its own scrim colour and white panel, which
        // meant it ignored the dark surface every other dialog uses. Same markup
        // as the rest of the app's modals now.
        <div className="modal-scrim" role="dialog" aria-modal="true">
          <button
            type="button"
            className="fixed inset-0"
            onClick={() => setShowImportHelp(false)}
            aria-label={t('common', 'close')}
          />
          <div className="modal-panel relative max-w-lg p-6">
            <button
              type="button"
              onClick={() => setShowImportHelp(false)}
              className="icon-btn absolute top-4 right-4"
              aria-label={t('common', 'close')}
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="font-display mb-3 text-lg font-bold tracking-tight text-ink dark:text-surface-text">
              {t('top40Import', 'helpTitle').replace('{label}', listLabel)}
            </h3>
            <p className="mb-4 text-sm text-ink-soft dark:text-neutral-400">
              {t('top40Import', 'helpDescription')}
            </p>
            {/* The required column is the one distinction that matters here, so
                it is the only one that takes the brand colour. */}
            <ul className="mb-4 space-y-1.5 text-sm text-ink dark:text-neutral-300">
              <li className="flex gap-2">
                <span className="font-bold text-brand">•</span>
                {t('top40Import', 'helpColumnCompany')}
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-neutral-400">•</span>
                {t('top40Import', 'helpColumnContact')}
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-neutral-400">•</span>
                {t('top40Import', 'helpColumnPosition')}
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-neutral-400">•</span>
                {t('top40Import', 'helpColumnRegNumber')}
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-neutral-400">•</span>
                {t('top40Import', 'helpColumnNotes')}
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-neutral-400">•</span>
                {t('top40Import', 'helpColumnTags')}
              </li>
            </ul>
            <p className="mb-2 text-sm text-ink-soft dark:text-neutral-400">
              {t('top40Import', 'helpAutoDetect')}
            </p>
            <p className="mb-4 text-sm font-medium text-ink dark:text-neutral-200">
              {t('top40Import', 'helpRequiredNote')}
            </p>
            <button
              type="button"
              onClick={() => {
                handleDownloadTemplate()
                setShowImportHelp(false)
              }}
              className="btn btn-line px-4 py-2 text-sm"
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
