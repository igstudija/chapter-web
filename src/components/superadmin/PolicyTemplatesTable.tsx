'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { PolicyTemplate } from '@/payload-types'
import { RichTextEditor } from '@/components/RichTextEditor'

interface PolicyTemplatesTableProps {
  readonly initialTemplates?: PolicyTemplate[]
}

interface EditPolicyModalProps {
  readonly policy: PolicyTemplate
  readonly onClose: () => void
  readonly onSave: () => void
}

const POLICY_TYPE_LABELS: Record<string, string> = {
  terms: 'Terms and Conditions',
  privacy: 'Privacy Policy',
  cookies: 'Cookie Policy',
}

const LOCALE_LABELS: Record<string, string> = {
  lv: 'Latvian (LV)',
  en: 'English (EN)',
}

function EditPolicyModal({ policy, onClose, onSave }: EditPolicyModalProps) {
  const [formData, setFormData] = useState({
    title: policy.title,
    content: policy.content || '',
    lastUpdated: policy.lastUpdated
      ? new Date(policy.lastUpdated).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/policy-templates/${policy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.errors?.[0]?.message || 'Failed to update policy')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Edit: {POLICY_TYPE_LABELS[policy.type]} ({LOCALE_LABELS[policy.locale]})
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Available placeholders: {'{site-name}'}, {'{site-email}'}, {'{site-domain}'},{' '}
          {'{current-date}'}, {'{last-updated}'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="policy-title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Title
            </label>
            <input
              id="policy-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content
            </label>
            <RichTextEditor
              value={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value })}
              height={400}
            />
          </div>

          <div>
            <label
              htmlFor="policy-lastUpdated"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Last Updated Date
            </label>
            <input
              id="policy-lastUpdated"
              type="date"
              value={formData.lastUpdated}
              onChange={(e) => setFormData({ ...formData, lastUpdated: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface CreatePolicyModalProps {
  readonly onClose: () => void
  readonly onSave: () => void
  readonly existingPolicies: PolicyTemplate[]
}

function CreatePolicyModal({ onClose, onSave, existingPolicies }: CreatePolicyModalProps) {
  const [formData, setFormData] = useState<{
    type: 'terms' | 'privacy' | 'cookies'
    locale: 'lv' | 'en'
    title: string
    content: string
    lastUpdated: string
  }>({
    type: 'terms',
    locale: 'lv',
    title: '',
    content: '',
    lastUpdated: new Date().toISOString().split('T')[0],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check which combinations already exist
  const existingCombinations = existingPolicies.map((p) => `${p.type}-${p.locale}`)
  const isAlreadyExists = existingCombinations.includes(`${formData.type}-${formData.locale}`)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isAlreadyExists) {
      setError('This policy type and language combination already exists')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/policy-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.errors?.[0]?.message || 'Failed to create policy')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Create New Policy Template
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Available placeholders: {'{site-name}'}, {'{site-email}'}, {'{site-domain}'},{' '}
          {'{current-date}'}, {'{last-updated}'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="policy-type"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Policy Type *
              </label>
              <select
                id="policy-type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as 'terms' | 'privacy' | 'cookies',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="terms">Terms and Conditions</option>
                <option value="privacy">Privacy Policy</option>
                <option value="cookies">Cookie Policy</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="policy-locale"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Language *
              </label>
              <select
                id="policy-locale"
                value={formData.locale}
                onChange={(e) =>
                  setFormData({ ...formData, locale: e.target.value as 'lv' | 'en' })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="lv">Latvian (LV)</option>
                <option value="en">English (EN)</option>
              </select>
            </div>
          </div>

          {isAlreadyExists && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                This combination already exists. Edit the existing template instead.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="create-policy-title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Title *
            </label>
            <input
              id="create-policy-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              required
              placeholder="e.g., Lietošanas noteikumi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content *
            </label>
            <RichTextEditor
              value={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value })}
              height={300}
              placeholder="Start typing your policy content..."
            />
          </div>

          <div>
            <label
              htmlFor="create-policy-lastUpdated"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Last Updated Date
            </label>
            <input
              id="create-policy-lastUpdated"
              type="date"
              value={formData.lastUpdated}
              onChange={(e) => setFormData({ ...formData, lastUpdated: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isAlreadyExists}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function PolicyTemplatesTable({ initialTemplates = [] }: PolicyTemplatesTableProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState<PolicyTemplate[]>(initialTemplates)
  const [editingPolicy, setEditingPolicy] = useState<PolicyTemplate | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [isLoading, setIsLoading] = useState(initialTemplates.length === 0)
  const [filterType, setFilterType] = useState<string>('')
  const [filterLocale, setFilterLocale] = useState<string>('')

  // Fetch templates on mount if not provided
  useEffect(() => {
    if (initialTemplates.length === 0) {
      fetchTemplates()
    }
  }, [initialTemplates.length])

  const fetchTemplates = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/policy-templates?limit=100')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.docs || [])
      }
    } catch (error) {
      console.error('Failed to fetch policy templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = () => {
    setEditingPolicy(null)
    setShowCreate(false)
    fetchTemplates()
    router.refresh()
  }

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesType = filterType === '' || template.type === filterType
    const matchesLocale = filterLocale === '' || template.locale === filterLocale
    return matchesType && matchesLocale
  })

  // Sort by type then locale
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type)
    return a.locale.localeCompare(b.locale)
  })

  return (
    <>
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Policy Templates ({templates.length})
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Universal templates for all sites with placeholder support
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            + New Template
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 py-4 sm:px-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4">
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">All Types</option>
                <option value="terms">Terms and Conditions</option>
                <option value="privacy">Privacy Policy</option>
                <option value="cookies">Cookie Policy</option>
              </select>
            </div>
            <div>
              <select
                value={filterLocale}
                onChange={(e) => setFilterLocale(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">All Languages</option>
                <option value="lv">Latvian</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700">
          {isLoading ? (
            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
              Loading templates...
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Language
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedTemplates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No policy templates found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  sortedTemplates.map((template) => (
                    <tr key={template.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            template.type === 'terms'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : template.type === 'privacy'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                          }`}
                        >
                          {POLICY_TYPE_LABELS[template.type]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          {LOCALE_LABELS[template.locale]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {template.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {template.lastUpdated
                            ? new Date(template.lastUpdated).toLocaleDateString('lv-LV')
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setEditingPolicy(template)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Info about expected templates */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Expected: 6 templates (Terms, Privacy, Cookies - each in LV and EN)
          </p>
        </div>
      </div>

      {editingPolicy && (
        <EditPolicyModal
          policy={editingPolicy}
          onClose={() => setEditingPolicy(null)}
          onSave={handleSave}
        />
      )}

      {showCreate && (
        <CreatePolicyModal
          onClose={() => setShowCreate(false)}
          onSave={handleSave}
          existingPolicies={templates}
        />
      )}
    </>
  )
}
