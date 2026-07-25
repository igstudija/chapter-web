'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Site, SiteMembership, User } from '@/payload-types'

type UserReference = User | string | null | undefined

// Searchable Select component (Select2-like)
interface SearchableSelectProps {
  options: { value: string; label: string; sublabel?: string }[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  required,
}: Readonly<SearchableSelectProps>) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find((o) => o.value === value)

  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(search.toLowerCase()) ||
      option.sublabel?.toLowerCase().includes(search.toLowerCase()),
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" value={value} required={required} />
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-left flex justify-between items-center"
      >
        <span className={selectedOption ? '' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-9999 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-600">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No results found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                    setSearch('')
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 ${
                    option.value === value ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                >
                  <div className="text-sm text-gray-900 dark:text-white">{option.label}</div>
                  {option.sublabel && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {option.sublabel}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface MembershipsTableProps {
  memberships: SiteMembership[]
  sites: Site[]
  users: User[]
}

interface EditMembershipModalProps {
  membership: SiteMembership
  sites: Site[]
  onClose: () => void
  onSave: () => void
}

function EditMembershipModal({
  membership,
  sites,
  onClose,
  onSave,
}: Readonly<EditMembershipModalProps>) {
  const currentSiteId = typeof membership.site === 'object' ? membership.site?.id : membership.site
  const [formData, setFormData] = useState({
    site: currentSiteId || '',
    company: membership.company || '',
    role: membership.role || 'member',
    status: membership.status || 'active',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/site-memberships/${membership.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.errors?.[0]?.message || 'Failed to update membership')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const getUserInfo = (user: UserReference) => {
    if (!user || typeof user === 'string') return { name: '-', email: '' }
    return {
      name: `${user.name || ''} ${user.surname || ''}`.trim() || user.email,
      email: user.email,
    }
  }

  const userInfo = getUserInfo(membership.user as User)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Edit Membership</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {userInfo.name} ({userInfo.email})
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="edit-site"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Site
            </label>
            <select
              id="edit-site"
              value={formData.site}
              onChange={(e) => setFormData({ ...formData, site: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="">Select Site</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="edit-company"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Company
            </label>
            <input
              id="edit-company"
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="edit-role"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Role
            </label>
            <select
              id="edit-role"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value as 'member' | 'member-admin' })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            >
              <option value="member">Member</option>
              <option value="member-admin">Admin</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="edit-status"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Status
            </label>
            <select
              id="edit-status"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as 'active' | 'blocked' })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            >
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
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

interface CreateMembershipModalProps {
  sites: Site[]
  users: User[]
  onClose: () => void
  onSave: () => void
}

function CreateMembershipModal({
  sites,
  users,
  onClose,
  onSave,
}: Readonly<CreateMembershipModalProps>) {
  const [formData, setFormData] = useState({
    user: '',
    site: '',
    role: 'member' as 'member' | 'member-admin',
    status: 'active' as 'active' | 'blocked',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/site-memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.errors?.[0]?.message || 'Failed to create membership')
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add User to Site</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="create-user"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              User *
            </label>
            <SearchableSelect
              options={users.map((user) => ({
                value: String(user.id),
                label: `${user.name || ''} ${user.surname || ''}`.trim() || user.email,
                sublabel: user.email,
              }))}
              value={formData.user}
              onChange={(value) => setFormData({ ...formData, user: value })}
              placeholder="Select a user..."
              required
            />
          </div>

          <div>
            <label
              htmlFor="create-site"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Site *
            </label>
            <SearchableSelect
              options={sites.map((site) => ({
                value: String(site.id),
                label: site.name,
              }))}
              value={formData.site}
              onChange={(value) => setFormData({ ...formData, site: value })}
              placeholder="Select a site..."
              required
            />
          </div>

          <div>
            <label
              htmlFor="create-role"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Role
            </label>
            <select
              id="create-role"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value as 'member' | 'member-admin' })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            >
              <option value="member">Member</option>
              <option value="member-admin">Member + Admin</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="create-status"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Status
            </label>
            <select
              id="create-status"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as 'active' | 'blocked' })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            >
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
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
              {isLoading ? 'Creating...' : 'Create Membership'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const ITEMS_PER_PAGE = 10

export function MembershipsTable({ memberships, sites, users }: Readonly<MembershipsTableProps>) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [editingMembership, setEditingMembership] = useState<SiteMembership | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const getUserName = (user: UserReference): string => {
    if (!user) return '-'
    if (typeof user === 'string') return user
    return `${user.name || ''} ${user.surname || ''}`.trim() || user.email
  }

  const getUserEmail = (user: UserReference): string => {
    if (!user) return '-'
    if (typeof user === 'string') return ''
    return user.email
  }

  const getSiteName = (site: Site | string | null | undefined): string => {
    if (!site) return '-'
    if (typeof site === 'string') return site
    return site.name
  }

  const filteredMemberships = memberships.filter((m) => {
    // Search filter
    if (search) {
      const userName = getUserName(m.user as User).toLowerCase()
      const userEmail = getUserEmail(m.user as User).toLowerCase()
      const siteName = getSiteName(m.site as Site).toLowerCase()
      const company = (m.company || '').toLowerCase()
      const searchLower = search.toLowerCase()
      if (
        !userName.includes(searchLower) &&
        !userEmail.includes(searchLower) &&
        !siteName.includes(searchLower) &&
        !company.includes(searchLower)
      ) {
        return false
      }
    }
    // Site filter
    if (filterSite) {
      const siteId = typeof m.site === 'object' ? m.site?.id : m.site
      if (String(siteId) !== filterSite) return false
    }
    // Status filter
    if (filterStatus && m.status !== filterStatus) return false
    return true
  })

  // Pagination
  const totalPages = Math.ceil(filteredMemberships.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedMemberships = filteredMemberships.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleSiteFilterChange = (value: string) => {
    setFilterSite(value)
    setCurrentPage(1)
  }

  const handleStatusFilterChange = (value: string) => {
    setFilterStatus(value)
    setCurrentPage(1)
  }

  const handleSave = () => {
    setEditingMembership(null)
    setShowCreate(false)
    router.refresh()
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Site Memberships ({memberships.length})
          </h3>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            + Add User to Site
          </button>
        </div>
        {/* Filters */}
        <div className="px-4 py-4 sm:px-6 border-b border-gray-200 dark:border-gray-700 border-t">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by user, email, site, company..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div>
              <select
                value={filterSite}
                onChange={(e) => handleSiteFilterChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">All Sites</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedMemberships.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No memberships found
                  </td>
                </tr>
              ) : (
                paginatedMemberships.map((membership) => (
                  <tr key={membership.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {getUserName(membership.user as User)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {getUserEmail(membership.user as User)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {getSiteName(membership.site as Site)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {membership.company || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          membership.role === 'member-admin'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {membership.role === 'member-admin' ? 'Admin' : 'Member'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          membership.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {membership.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingMembership(membership)}
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
            Showing {filteredMemberships.length === 0 ? 0 : startIndex + 1}-
            {Math.min(startIndex + ITEMS_PER_PAGE, filteredMemberships.length)} of{' '}
            {filteredMemberships.length}
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

      {editingMembership && (
        <EditMembershipModal
          membership={editingMembership}
          sites={sites}
          onClose={() => setEditingMembership(null)}
          onSave={handleSave}
        />
      )}

      {showCreate && (
        <CreateMembershipModal
          sites={sites}
          users={users}
          onClose={() => setShowCreate(false)}
          onSave={handleSave}
        />
      )}
    </>
  )
}
