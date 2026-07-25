'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Site } from '@/payload-types'
import { DEFAULT_LOCALE } from '@/lib/i18n'

interface SitesTableProps {
  readonly sites: Site[]
}

interface EditSiteModalProps {
  readonly site: Site
  readonly onClose: () => void
  readonly onSave: () => void
}

function EditSiteModal({ site, onClose, onSave }: EditSiteModalProps) {
  const [formData, setFormData] = useState({
    name: site.name,
    slug: site.slug,
    domain: site.domain || '',
    status: site.status || 'active',
    locale: site.locale || DEFAULT_LOCALE,
    enableActivities: site.enableActivities || false,
    enableAttendance: site.enableAttendance || false,
    enableSuccessStories: site.enableSuccessStories !== false,
    enableAiChat: site.enableAiChat || false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/sites/${site.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.errors?.[0]?.message || 'Failed to update site')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Edit Site: {site.name}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="edit-site-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Name
            </label>
            <input
              id="edit-site-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label
              htmlFor="edit-site-slug"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Slug
            </label>
            <input
              id="edit-site-slug"
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label
              htmlFor="edit-site-domain"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Domain
            </label>
            <input
              id="edit-site-domain"
              type="text"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              placeholder="example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-site-status"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Status
              </label>
              <select
                id="edit-site-status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="edit-site-locale"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Language
              </label>
              <select
                id="edit-site-locale"
                value={formData.locale}
                onChange={(e) =>
                  setFormData({ ...formData, locale: e.target.value as 'lv' | 'en' })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="lv">Latvian</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableActivities"
              checked={formData.enableActivities}
              onChange={(e) => setFormData({ ...formData, enableActivities: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label
              htmlFor="enableActivities"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Enable Activities
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableAttendance"
              checked={formData.enableAttendance}
              onChange={(e) => setFormData({ ...formData, enableAttendance: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label
              htmlFor="enableAttendance"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Enable Attendance
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableSuccessStories"
              checked={formData.enableSuccessStories}
              onChange={(e) => setFormData({ ...formData, enableSuccessStories: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label
              htmlFor="enableSuccessStories"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Enable Success Stories
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableAiChat"
              checked={formData.enableAiChat}
              onChange={(e) => setFormData({ ...formData, enableAiChat: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label
              htmlFor="enableAiChat"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Enable AI Chat
            </label>
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

interface CreateSiteModalProps {
  readonly onClose: () => void
  readonly onSave: () => void
}

function CreateSiteModal({ onClose, onSave }: CreateSiteModalProps) {
  const [formData, setFormData] = useState<{
    name: string
    slug: string
    domain: string
    status: 'active' | 'inactive'
    locale: 'lv' | 'en'
    enableActivities: boolean
    enableAttendance: boolean
    enableSuccessStories: boolean
    enableAiChat: boolean
  }>({
    name: '',
    slug: '',
    domain: '',
    status: 'active',
    locale: 'lv',
    enableActivities: false,
    enableAttendance: false,
    enableSuccessStories: true,
    enableAiChat: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.errors?.[0]?.message || 'Failed to create site')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New Site</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="create-site-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Name *
            </label>
            <input
              id="create-site-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              required
              placeholder="Organisation name"
            />
          </div>

          <div>
            <label
              htmlFor="create-site-slug"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Slug *
            </label>
            <input
              id="create-site-slug"
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              required
              placeholder="chapter-slug"
            />
          </div>

          <div>
            <label
              htmlFor="create-site-domain"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Domain
            </label>
            <input
              id="create-site-domain"
              type="text"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              placeholder="chapter.example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="create-site-status"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Status
              </label>
              <select
                id="create-site-status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="create-site-locale"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Language
              </label>
              <select
                id="create-site-locale"
                value={formData.locale}
                onChange={(e) =>
                  setFormData({ ...formData, locale: e.target.value as 'lv' | 'en' })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="lv">Latvian</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="createEnableActivities"
              checked={formData.enableActivities}
              onChange={(e) => setFormData({ ...formData, enableActivities: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label
              htmlFor="createEnableActivities"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Enable Activities
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="createEnableAttendance"
              checked={formData.enableAttendance}
              onChange={(e) => setFormData({ ...formData, enableAttendance: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label
              htmlFor="createEnableAttendance"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Enable Attendance
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="createEnableSuccessStories"
              checked={formData.enableSuccessStories}
              onChange={(e) => setFormData({ ...formData, enableSuccessStories: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label
              htmlFor="createEnableSuccessStories"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Enable Success Stories
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="createEnableAiChat"
              checked={formData.enableAiChat}
              onChange={(e) => setFormData({ ...formData, enableAiChat: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label
              htmlFor="createEnableAiChat"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Enable AI Chat
            </label>
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
              {isLoading ? 'Creating...' : 'Create Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const ITEMS_PER_PAGE = 10

export function SitesTable({ sites }: SitesTableProps) {
  const router = useRouter()
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)

  const handleSave = () => {
    setEditingSite(null)
    setShowCreate(false)
    router.refresh()
  }

  // Filter sites
  const filteredSites = sites.filter((site) => {
    const matchesSearch =
      search === '' ||
      site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.slug.toLowerCase().includes(search.toLowerCase()) ||
      site.domain?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filterStatus === '' || site.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Pagination
  const totalPages = Math.ceil(filteredSites.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedSites = filteredSites.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleFilterChange = (value: string) => {
    setFilterStatus(value)
    setCurrentPage(1)
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Sites ({sites.length})
          </h3>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            + New Site
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 py-4 sm:px-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name, slug, domain..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Activities
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedSites.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No sites found
                  </td>
                </tr>
              ) : (
                paginatedSites.map((site) => (
                  <tr key={site.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {site.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{site.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{site.domain}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          site.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {site.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {site.locale === 'en' ? 'English' : 'Latvian'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          site.enableActivities
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {site.enableActivities ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingSite(site)}
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
        </div>

        {/* Footer with pagination */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredSites.length === 0 ? 0 : startIndex + 1}-
            {Math.min(startIndex + ITEMS_PER_PAGE, filteredSites.length)} of {filteredSites.length}
          </div>
          {totalPages > 1 && (
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm border rounded ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {editingSite && (
        <EditSiteModal
          site={editingSite}
          onClose={() => setEditingSite(null)}
          onSave={handleSave}
        />
      )}

      {showCreate && <CreateSiteModal onClose={() => setShowCreate(false)} onSave={handleSave} />}
    </>
  )
}
