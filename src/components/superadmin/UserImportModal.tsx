'use client'

import { useState } from 'react'
import type { Site } from '@/payload-types'

interface UserImportModalProps {
  readonly sites: Site[]
  readonly onClose: () => void
  readonly onSuccess: () => void
}

interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; email: string; error: string }>
}

interface ColumnMapping {
  [excelColumn: string]: string
}

const SYSTEM_FIELDS = [
  { value: '', label: '-- Ignore this column --' },
  { value: 'email', label: 'Email *', required: true },
  { value: 'name', label: 'Name *', required: true },
  { value: 'surname', label: 'Surname *', required: true },
  { value: 'role', label: 'Role (member/member-admin)' },
  { value: 'status', label: 'Status (active/blocked)' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'jobPosition', label: 'Job Position' },
  { value: 'orgRole', label: 'Position' },
  { value: 'companyPhone', label: 'Company Phone' },
  { value: 'companyEmail', label: 'Company Email' },
  { value: 'website', label: 'Website' },
  { value: 'description', label: 'About Me / Description' },
  { value: 'companyDescription', label: 'Company Description' },
  { value: 'inaugurationDate', label: 'Inauguration Date' },
  { value: 'powerGroupLead', label: 'Power Group Lead (yes/no)' },
  { value: 'attendanceType', label: 'Attendance Type (online/onsite)' },
  { value: 'videoUrl', label: 'Video URL' },
  { value: 'linkedinUrl', label: 'LinkedIn URL' },
  { value: 'facebookUrl', label: 'Facebook URL' },
  { value: 'instagramUrl', label: 'Instagram URL' },
  { value: 'twitterUrl', label: 'Twitter URL' },
]

export function UserImportModal({ sites, onClose, onSuccess }: UserImportModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'result'>('upload')
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [excelColumns, setExcelColumns] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setError('Please select an Excel file (.xlsx or .xls)')
      return
    }

    setFile(selectedFile)
    setError(null)

    // Load column preview
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('previewOnly', 'true')

      const response = await fetch('/api/superadmin/import-users', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.preview) {
        setExcelColumns(data.preview)
        // Auto-map columns with matching names
        const autoMapping: ColumnMapping = {}
        data.preview.forEach((col: string) => {
          const normalized = col.toLowerCase().trim()
          const match = SYSTEM_FIELDS.find(
            (f) => f.value && normalized.includes(f.value.toLowerCase()),
          )
          if (match) {
            autoMapping[col] = match.value
          }
        })
        setColumnMapping(autoMapping)
      }
    } catch (err) {
      console.error('Failed to load column preview:', err)
    }
  }

  const handleNextToMapping = () => {
    if (!selectedSite) {
      setError('Please select an organisation')
      return
    }
    if (!file) {
      setError('Please select an Excel file')
      return
    }
    setError(null)
    setStep('mapping')
  }

  const handleMappingChange = (excelCol: string, systemField: string) => {
    setColumnMapping((prev) => {
      const newMapping = { ...prev }
      if (systemField === '') {
        delete newMapping[excelCol]
      } else {
        newMapping[excelCol] = systemField
      }
      return newMapping
    })
  }

  const handleImport = async () => {
    // Validate required mappings
    const requiredFields = SYSTEM_FIELDS.filter((f) => f.required).map((f) => f.value)
    const mappedFields = Object.values(columnMapping)
    const missingFields = requiredFields.filter((f) => !mappedFields.includes(f))

    if (missingFields.length > 0) {
      setError(`Missing required field mappings: ${missingFields.join(', ')}`)
      return
    }

    setIsUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file!)
      formData.append('siteId', selectedSite)
      formData.append('mapping', JSON.stringify(columnMapping))

      const response = await fetch('/api/superadmin/import-users', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import users')
      }

      setResult(data)
      setStep('result')

      if (data.success > 0) {
        setTimeout(() => {
          onSuccess()
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent =
      'email,name,surname,role,status,phone,company,jobPosition,orgRole,companyPhone,companyEmail,website,description,companyDescription,inaugurationDate,powerGroupLead,attendanceType,videoUrl,linkedinUrl,facebookUrl,instagramUrl,twitterUrl\n' +
      'john.doe@example.com,John,Doe,member,active,+371 12345678,Acme Corp,CEO,President,+371 11111111,info@acme.com,www.acme.com,Experienced CEO,Leading IT company,2024-01-15,yes,onsite,https://youtube.com/watch?v=123,https://linkedin.com/in/johndoe,https://facebook.com/johndoe,https://instagram.com/johndoe,https://twitter.com/johndoe\n' +
      'jane.smith@example.com,Jane,Smith,member-admin,active,+371 87654321,Tech Solutions,CTO,Vice President,+371 22222222,contact@tech.com,www.tech.com,Tech expert,Innovative solutions,2023-06-20,no,online,,,,,,'

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = globalThis.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user-import-template.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    globalThis.URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Import Users from Excel
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {result && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Import Results</h3>
            <div className="space-y-1 text-sm">
              <p className="text-green-700 dark:text-green-300">
                ✓ Successfully imported: {result.success}
              </p>
              {result.failed > 0 && (
                <>
                  <p className="text-red-700 dark:text-red-300">✗ Failed: {result.failed}</p>
                  {result.errors.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      <p className="font-medium text-red-800 dark:text-red-200 mb-1">Errors:</p>
                      <ul className="list-disc list-inside space-y-1 text-red-700 dark:text-red-300">
                        {result.errors.map((err) => (
                          <li key={`${err.row}-${err.email}`}>
                            Row {err.row} ({err.email}): {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div
            className={`flex items-center gap-2 ${step === 'upload' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              1
            </div>
            <span>Upload</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-300" />
          <div
            className={`flex items-center gap-2 ${step === 'mapping' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'mapping' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              2
            </div>
            <span>Map Columns</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-300" />
          <div
            className={`flex items-center gap-2 ${step === 'result' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'result' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              3
            </div>
            <span>Results</span>
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="import-organisation"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Organisation *
              </label>
              <select
                id="import-organisation"
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select an organisation...</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="excel-file-input"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Excel File *
              </label>
              <input
                id="excel-file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200"
              />
              {file && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Selected: {file.name}
                </p>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Instructions
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc list-inside">
                <li>Upload Excel file with user data</li>
                <li>Next step: map your Excel columns to system fields</li>
                <li>
                  Default password for new users:{' '}
                  <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">ChangeMe123!</code>
                </li>
              </ul>
              <button
                type="button"
                onClick={downloadTemplate}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 underline"
              >
                Download CSV Template
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNextToMapping}
                disabled={!selectedSite || !file}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                Next: Map Columns
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Map your Excel columns to system fields. Required fields are marked with *
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Excel Column
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Maps To
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {excelColumns.map((col) => (
                    <tr key={col}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white font-medium">
                        {col}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={columnMapping[col] || ''}
                          onChange={(e) => handleMappingChange(col, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        >
                          {SYSTEM_FIELDS.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                {isUploading ? 'Importing...' : 'Import Users'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
