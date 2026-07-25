'use client'

import { useState, useCallback, useMemo } from 'react'
import { X, Upload, FileSpreadsheet, AlertCircle, Check } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useTranslations } from './TranslationsProvider'

interface Top40ImportModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onImport: (entries: ImportedEntry[]) => Promise<void>
  /** Modal title override (e.g. "Import Top 20"). */
  readonly title?: string
}

export interface ImportedEntry {
  companyName: string
  contactPerson: string
  position?: string
  registrationNumber?: string
  notes?: string
  businessTags?: string
}

type FieldKey =
  | 'companyName'
  | 'contactPerson'
  | 'firstName'
  | 'lastName'
  | 'position'
  | 'registrationNumber'
  | 'notes'
  | 'businessTags'
  | 'skip'

interface ColumnMapping {
  [columnIndex: number]: FieldKey
}

const FIELD_KEYS: { value: FieldKey; labelKey: string; required?: boolean }[] = [
  { value: 'skip', labelKey: 'fieldSkip' },
  { value: 'companyName', labelKey: 'fieldCompany', required: true },
  { value: 'contactPerson', labelKey: 'fieldContactPerson' },
  { value: 'firstName', labelKey: 'fieldFirstName' },
  { value: 'lastName', labelKey: 'fieldLastName' },
  { value: 'position', labelKey: 'fieldPosition' },
  { value: 'registrationNumber', labelKey: 'fieldRegNumber' },
  { value: 'notes', labelKey: 'fieldNotes' },
  { value: 'businessTags', labelKey: 'fieldTags' },
]

// Common column name patterns for auto-detection
const COLUMN_PATTERNS: Record<FieldKey, RegExp[]> = {
  companyName: [/uzņēmum/i, /company/i, /firma/i, /nosaukum/i, /organization/i],
  contactPerson: [/kontakt/i, /persona/i, /person/i, /^name$/i],
  firstName: [/^vārds$/i, /first.?name/i, /^vards$/i],
  lastName: [/^uzvārds$/i, /last.?name/i, /surname/i, /^uzvards$/i],
  position: [/amats/i, /position/i, /statuss/i, /status/i, /loma/i, /role/i],
  registrationNumber: [/reģ/i, /reg/i, /nr/i, /number/i, /numur/i],
  notes: [/nozare/i, /piezīm/i, /aprakst/i, /description/i, /notes/i, /koment/i],
  businessTags: [/tag/i, /tagi/i, /birk/i, /atslēgvārd/i, /keyword/i, /label/i],
  skip: [],
}

function detectColumnType(headerText: string): FieldKey {
  const text = headerText.toLowerCase().trim()

  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    if (field === 'skip') continue
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return field as FieldKey
      }
    }
  }

  return 'skip'
}

function findDataStartRow(data: string[][]): number {
  // Find first row that looks like data (not empty, not just numbers)
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i]
    if (!row || row.every((cell) => !cell || cell.toString().trim() === '')) continue

    // Check if this looks like a header row
    const nonEmptyCells = row.filter((cell) => cell?.toString().trim())
    if (nonEmptyCells.length >= 2) {
      return i
    }
  }
  return 0
}

function findDataStartColumn(data: string[][]): number {
  // Find first column that has data
  for (let col = 0; col < 10; col++) {
    for (let row = 0; row < Math.min(data.length, 10); row++) {
      const cell = data[row]?.[col]
      if (cell?.toString().trim()) {
        return col
      }
    }
  }
  return 0
}

export function Top40ImportModal({ isOpen, onClose, onImport, title }: Top40ImportModalProps) {
  const { t } = useTranslations()
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload')
  const [rawData, setRawData] = useState<string[][]>([])
  const [headerRow, setHeaderRow] = useState(0)
  const [startColumn, setStartColumn] = useState(0)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    try {
      const data = await file.arrayBuffer()
      // Use 'array' type for proper UTF-8 support
      const workbook = XLSX.read(data, { type: 'array', codepage: 65001 })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]

      // Convert to array of arrays
      const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        defval: '',
        blankrows: false,
      })

      if (jsonData.length === 0) {
        setError(t('top40Import', 'fileEmpty'))
        return
      }

      // Detect start positions
      const startRow = findDataStartRow(jsonData)
      const startCol = findDataStartColumn(jsonData)

      setRawData(jsonData)
      setHeaderRow(startRow)
      setStartColumn(startCol)

      // Auto-detect column mappings from header row
      const headers = jsonData[startRow] || []
      const autoMapping: ColumnMapping = {}
      const usedFields = new Set<FieldKey>()

      headers.forEach((header: string, index: number) => {
        if (index < startCol) return
        const headerStr = String(header || '').trim()
        if (!headerStr) return

        const detectedType = detectColumnType(headerStr)

        // Handle combined "Vārds, Uzvārds" or "Vārds Uzvārds, amats" patterns
        if (
          headerStr.toLowerCase().includes('vārds') &&
          headerStr.toLowerCase().includes('uzvārds')
        ) {
          if (!usedFields.has('contactPerson')) {
            autoMapping[index] = 'contactPerson'
            usedFields.add('contactPerson')
          }
        } else if (detectedType !== 'skip') {
          // Allow both firstName and lastName to be mapped (they work together)
          if (detectedType === 'firstName' || detectedType === 'lastName') {
            if (!usedFields.has(detectedType)) {
              autoMapping[index] = detectedType
              usedFields.add(detectedType)
            }
          } else if (!usedFields.has(detectedType)) {
            autoMapping[index] = detectedType
            usedFields.add(detectedType)
          }
        }
      })

      setColumnMapping(autoMapping)
      setStep('mapping')
    } catch (err) {
      setError(t('top40Import', 'fileReadError'))
      console.error(err)
    }
  }, [])

  const headers = useMemo(() => {
    return rawData[headerRow]?.slice(startColumn) || []
  }, [rawData, headerRow, startColumn])

  const dataRows = useMemo(() => {
    return rawData.slice(headerRow + 1).map((row) => row.slice(startColumn))
  }, [rawData, headerRow, startColumn])

  const previewEntries = useMemo((): ImportedEntry[] => {
    const entries: ImportedEntry[] = []

    for (const row of dataRows) {
      const entry: Partial<ImportedEntry> & { firstName?: string; lastName?: string } = {}

      for (const [colIndexStr, field] of Object.entries(columnMapping)) {
        const colIndex = Number.parseInt(colIndexStr) - startColumn
        const value = row[colIndex]?.toString().trim() || ''

        if (field === 'skip' || !value) continue

        if (field === 'contactPerson') {
          entry.contactPerson = value
        } else if (field === 'firstName') {
          entry.firstName = value
        } else if (field === 'lastName') {
          entry.lastName = value
        } else if (field === 'companyName') {
          entry.companyName = value
        } else if (field === 'position') {
          entry.position = value
        } else if (field === 'registrationNumber') {
          entry.registrationNumber = value
        } else if (field === 'notes') {
          entry.notes = value
        } else if (field === 'businessTags') {
          entry.businessTags = value
        }
      }

      // Combine firstName + lastName into contactPerson if not already set
      if (!entry.contactPerson && (entry.firstName || entry.lastName)) {
        entry.contactPerson = [entry.firstName, entry.lastName].filter(Boolean).join(' ')
      }

      // Only add if has required fields
      if (entry.companyName && entry.contactPerson) {
        entries.push({
          companyName: entry.companyName,
          contactPerson: entry.contactPerson,
          position: entry.position,
          registrationNumber: entry.registrationNumber,
          notes: entry.notes,
          businessTags: entry.businessTags,
        })
      }
    }

    return entries
  }, [dataRows, columnMapping, startColumn])

  const hasRequiredMappings = useMemo(() => {
    const mappedFields = new Set(Object.values(columnMapping))
    const hasCompany = mappedFields.has('companyName')
    const hasContactPerson = mappedFields.has('contactPerson')
    const hasFirstName = mappedFields.has('firstName')
    const hasLastName = mappedFields.has('lastName')
    // Valid if has company AND (contactPerson OR firstName OR lastName)
    return hasCompany && (hasContactPerson || hasFirstName || hasLastName)
  }, [columnMapping])

  const handleMappingChange = (columnIndex: number, field: FieldKey) => {
    setColumnMapping((prev) => {
      const newMapping = { ...prev }

      // Remove this field from any other column
      // firstName and lastName are unique per column, but both can exist in mapping
      for (const [key, value] of Object.entries(newMapping)) {
        if (value === field && field !== 'skip' && Number.parseInt(key) !== columnIndex) {
          delete newMapping[Number.parseInt(key)]
        }
      }

      if (field === 'skip') {
        delete newMapping[columnIndex]
      } else {
        newMapping[columnIndex] = field
      }

      return newMapping
    })
  }

  const handleImport = async () => {
    if (previewEntries.length === 0) {
      setError(t('top40Import', 'noEntriesForImport'))
      return
    }

    setImporting(true)
    setStep('importing')

    try {
      await onImport(previewEntries)
      onClose()
    } catch (err) {
      console.error('Import failed:', err)
      const errorMessage = err instanceof Error ? err.message : t('top40Import', 'unknownError')
      setError(t('top40Import', 'importError').replace('{error}', errorMessage))
      setStep('preview')
    } finally {
      setImporting(false)
    }
  }

  const resetModal = () => {
    setStep('upload')
    setRawData([])
    setHeaderRow(0)
    setStartColumn(0)
    setColumnMapping({})
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6 text-brand" />
            <h2 className="text-xl font-bold text-ink dark:text-surface-text">
              {title ?? t('top40Import', 'title').replace('{label}', '').replace(/\s+/g, ' ').trim()}
            </h2>
          </div>
          <button
            onClick={() => {
              resetModal()
              onClose()
            }}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="text-center py-12">
              <Upload className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-ink dark:text-surface-text mb-2">
                {t('top40Import', 'uploadTitle')}
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                {t('top40Import', 'supportedFormats')}
              </p>
              <label className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-lg hover:bg-brand/90 cursor-pointer transition-colors">
                <Upload className="h-5 w-5" />
                {t('top40Import', 'chooseFile')}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-ink dark:text-surface-text mb-2">
                  {t('top40Import', 'columnMapping')}
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                  {t('top40Import', 'columnMappingDesc')}
                </p>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <div>
                  <label
                    htmlFor="header-row-select"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    {t('top40Import', 'headerRow')}
                  </label>
                  <select
                    id="header-row-select"
                    value={headerRow}
                    onChange={(e) => setHeaderRow(Number.parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 bg-white text-ink dark:bg-surface dark:text-surface-text rounded-lg text-sm"
                  >
                    {rawData.slice(0, 10).map((row, i) => (
                      <option key={`row-${i}-${row[0] || ''}`} value={i}>
                        {t('top40Import', 'row')} {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="start-column-select"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    {t('top40Import', 'startColumn')}
                  </label>
                  <select
                    id="start-column-select"
                    value={startColumn}
                    onChange={(e) => setStartColumn(Number.parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 bg-white text-ink dark:bg-surface dark:text-surface-text rounded-lg text-sm"
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const colLetter = String.fromCodePoint(65 + i)
                      return (
                        <option key={`col-${colLetter}`} value={i}>
                          {t('top40Import', 'column')} {colLetter}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              {/* Column mapping table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="text-left py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                        {t('top40Import', 'column')}
                      </th>
                      <th className="text-left py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                        {t('top40Import', 'header')}
                      </th>
                      <th className="text-left py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                        {t('top40Import', 'example')}
                      </th>
                      <th className="text-left py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                        {t('top40Import', 'mapTo')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((header, index) => {
                      const actualIndex = index + startColumn
                      const sampleValue = dataRows[0]?.[index] || ''
                      return (
                        <tr
                          key={`col-${actualIndex}-${header || 'empty'}`}
                          className="border-b border-neutral-100 dark:border-neutral-800"
                        >
                          <td className="py-2 px-3 text-neutral-400">
                            {String.fromCodePoint(65 + actualIndex)}
                          </td>
                          <td className="py-2 px-3 font-medium text-ink dark:text-surface-text">
                            {header || <span className="text-neutral-400 italic">{t('top40Import', 'empty')}</span>}
                          </td>
                          <td className="py-2 px-3 text-neutral-500 dark:text-neutral-400 max-w-[200px] truncate">
                            {sampleValue || '-'}
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={columnMapping[actualIndex] || 'skip'}
                              onChange={(e) =>
                                handleMappingChange(actualIndex, e.target.value as FieldKey)
                              }
                              className={`w-full px-2 py-1 border rounded text-sm ${
                                columnMapping[actualIndex] && columnMapping[actualIndex] !== 'skip'
                                  ? 'border-brand bg-brand/5 text-brand'
                                  : 'border-neutral-300 dark:border-neutral-600 bg-white text-ink dark:bg-surface dark:text-surface-text'
                              }`}
                            >
                              {FIELD_KEYS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {t('top40Import', opt.labelKey as 'fieldSkip')}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {!hasRequiredMappings && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400 text-sm">
                  {t('top40Import', 'requiredFieldsWarning')}
                </div>
              )}

              {/* Live preview of first few entries */}
              {hasRequiredMappings && previewEntries.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    {t('top40Import', 'resultPreview').replace('{count}', previewEntries.length.toString())}
                  </h4>
                  <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-50 dark:bg-neutral-800">
                        <tr>
                          <th className="text-left py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                            {t('top40Grid', 'company')}
                          </th>
                          <th className="text-left py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                            {t('top40Grid', 'contactPerson')}
                          </th>
                          <th className="text-left py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                            {t('top40Grid', 'position')}
                          </th>
                          <th className="text-left py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                            {t('top40Import', 'fieldTags')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewEntries.slice(0, 3).map((entry, idx) => (
                          <tr
                            key={`preview-${entry.companyName}-${entry.contactPerson}-${idx}`}
                            className="border-t border-neutral-100 dark:border-neutral-800"
                          >
                            <td className="py-2 px-3 font-medium text-ink dark:text-surface-text">
                              {entry.companyName}
                            </td>
                            <td className="py-2 px-3 text-neutral-700 dark:text-neutral-300">
                              {entry.contactPerson}
                            </td>
                            <td className="py-2 px-3 text-neutral-500 dark:text-neutral-400">
                              {entry.position || '-'}
                            </td>
                            <td className="py-2 px-3 text-neutral-500 dark:text-neutral-400 max-w-[200px] truncate">
                              {entry.businessTags || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewEntries.length > 3 && (
                      <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
                        {t('top40Import', 'andMoreEntries').replace('{count}', (previewEntries.length - 3).toString())}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-ink dark:text-surface-text">
                    {t('top40Import', 'preview')}
                  </h3>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                    {t('top40Import', 'foundEntries').replace('{count}', previewEntries.length.toString())}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                        #
                      </th>
                      <th className="text-left py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                        {t('top40Grid', 'company')}
                      </th>
                      <th className="text-left py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                        {t('top40Grid', 'contactPerson')}
                      </th>
                      <th className="text-left py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                        {t('top40Grid', 'position')}
                      </th>
                      <th className="text-left py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                        {t('top40Grid', 'regNumber')}
                      </th>
                      <th className="text-left py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                        {t('top40Import', 'fieldNotes')}
                      </th>
                      <th className="text-left py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                        {t('top40Import', 'fieldTags')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewEntries.slice(0, 50).map((entry, index) => (
                      <tr
                        key={`entry-${entry.companyName}-${entry.contactPerson}-${index}`}
                        className="border-b border-neutral-100 dark:border-neutral-800"
                      >
                        <td className="py-2 px-3 text-neutral-400">{index + 1}</td>
                        <td className="py-2 px-3 font-medium text-ink dark:text-surface-text">
                          {entry.companyName}
                        </td>
                        <td className="py-2 px-3 text-neutral-700 dark:text-neutral-300">
                          {entry.contactPerson}
                        </td>
                        <td className="py-2 px-3 text-neutral-500 dark:text-neutral-400">
                          {entry.position || '-'}
                        </td>
                        <td className="py-2 px-3 text-neutral-500 dark:text-neutral-400">
                          {entry.registrationNumber || '-'}
                        </td>
                        <td className="py-2 px-3 text-neutral-500 dark:text-neutral-400 max-w-[200px] truncate">
                          {entry.notes || '-'}
                        </td>
                        <td className="py-2 px-3 text-neutral-500 dark:text-neutral-400 max-w-[200px] truncate">
                          {entry.businessTags || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewEntries.length > 50 && (
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  {t('top40Import', 'showingFirst').replace('{shown}', '50').replace('{total}', previewEntries.length.toString())}
                </p>
              )}
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin h-12 w-12 border-4 border-brand border-t-transparent rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-medium text-ink dark:text-surface-text">
                {t('top40Import', 'importing').replace('{count}', previewEntries.length.toString())}
              </h3>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
          <div>
            {step !== 'upload' && step !== 'importing' && (
              <button
                onClick={() => setStep(step === 'preview' ? 'mapping' : 'upload')}
                className="px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                {t('top40Import', 'back')}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                resetModal()
                onClose()
              }}
              className="px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              {t('top40Import', 'cancel')}
            </button>
            {step === 'mapping' && (
              <button
                onClick={() => setStep('preview')}
                disabled={!hasRequiredMappings}
                className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('top40Import', 'continue')}
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={previewEntries.length === 0 || importing}
                className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                {t('top40Import', 'importEntries').replace('{count}', previewEntries.length.toString())}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
