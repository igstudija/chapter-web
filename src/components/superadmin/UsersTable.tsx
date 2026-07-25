'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User, Site, SiteMembership } from '@/payload-types'
import { UserImportModal } from './UserImportModal'

interface UsersTableProps {
  readonly users: User[]
  readonly memberships: SiteMembership[]
  readonly sites: Site[]
}

interface EditUserModalProps {
  readonly user: User
  readonly sites: Site[]
  readonly memberships: SiteMembership[]
  readonly onClose: () => void
  readonly onSave: () => void
}

interface UserMembership {
  id: number
  siteId: string | number
  siteName: string
  role: 'member' | 'member-admin'
  status: 'active' | 'blocked'
}

function EditUserModal({ user, sites, memberships, onClose, onSave }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    surname: user.surname || '',
    email: user.email,
    isSuperadmin: user.isSuperadmin || false,
  })
  const [newPassword, setNewPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get user's current memberships
  const getUserMemberships = (): UserMembership[] => {
    return memberships
      .filter((m) => {
        const memberUserId = typeof m.user === 'object' ? m.user?.id : m.user
        return memberUserId === user.id
      })
      .map((m) => {
        const site =
          typeof m.site === 'object' ? (m.site as Site) : sites.find((s) => s.id === m.site)
        return {
          id: m.id,
          siteId: site?.id || '',
          siteName: site?.name || '-',
          role: m.role,
          status: m.status,
        }
      })
  }

  const [userMemberships, setUserMemberships] = useState<UserMembership[]>(getUserMemberships())
  const [showAddSite, setShowAddSite] = useState(false)
  const [newSiteData, setNewSiteData] = useState({
    site: '',
    role: 'member' as 'member' | 'member-admin',
    status: 'active' as 'active' | 'blocked',
  })
  const [addingSite, setAddingSite] = useState(false)

  // Get available sites (not already assigned to user)
  const availableSites = sites.filter((site) => !userMemberships.some((m) => m.siteId === site.id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const updateData: Record<string, unknown> = { ...formData }
      if (newPassword) {
        updateData.password = newPassword
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.errors?.[0]?.message || 'Failed to update user')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSite = async () => {
    if (!newSiteData.site) return
    setAddingSite(true)
    setError(null)

    try {
      const response = await fetch('/api/site-memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user.id,
          site: Number(newSiteData.site),
          role: newSiteData.role,
          status: newSiteData.status,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.errors?.[0]?.message || 'Failed to add site')
      }

      const data = await response.json()
      const site = sites.find((s) => s.id === Number(newSiteData.site))

      setUserMemberships([
        ...userMemberships,
        {
          id: data.doc.id,
          siteId: newSiteData.site,
          siteName: site?.name || '-',
          role: newSiteData.role,
          status: newSiteData.status,
        },
      ])

      setNewSiteData({ site: '', role: 'member', status: 'active' })
      setShowAddSite(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setAddingSite(false)
    }
  }

  const handleRemoveSite = async (membershipId: number) => {
    setError(null)

    try {
      const response = await fetch(`/api/site-memberships/${membershipId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove site')
      }

      setUserMemberships(userMemberships.filter((m) => m.id !== membershipId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Edit User: {user.email}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Name
              </label>
              <input
                id="edit-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="edit-surname"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Surname
              </label>
              <input
                id="edit-surname"
                type="text"
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email
            </label>
            <input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label
              htmlFor="edit-password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              New Password (leave empty to keep current)
            </label>
            <input
              id="edit-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isSuperadmin"
              checked={formData.isSuperadmin}
              onChange={(e) => setFormData({ ...formData, isSuperadmin: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="isSuperadmin" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Superadmin
            </label>
          </div>

          {/* Sites section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sites ({userMemberships.length})
              </label>
              {availableSites.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddSite(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  + Add Site
                </button>
              )}
            </div>

            {/* Add site form */}
            {showAddSite && (
              <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newSiteData.site}
                    onChange={(e) => setNewSiteData({ ...newSiteData, site: e.target.value })}
                    className="col-span-3 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select site...</option>
                    {availableSites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newSiteData.role}
                    onChange={(e) =>
                      setNewSiteData({
                        ...newSiteData,
                        role: e.target.value as 'member' | 'member-admin',
                      })
                    }
                    className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                  >
                    <option value="member">Member</option>
                    <option value="member-admin">Admin</option>
                  </select>
                  <select
                    value={newSiteData.status}
                    onChange={(e) =>
                      setNewSiteData({
                        ...newSiteData,
                        status: e.target.value as 'active' | 'blocked',
                      })
                    }
                    className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={handleAddSite}
                      disabled={!newSiteData.site || addingSite}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {addingSite ? '...' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddSite(false)
                        setNewSiteData({ site: '', role: 'member', status: 'active' })
                      }}
                      className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sites list */}
            {userMemberships.length === 0 ? (
              <p className="text-sm text-gray-400">No sites assigned</p>
            ) : (
              <div className="space-y-2">
                {userMemberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {membership.siteName}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-xs rounded ${
                          membership.role === 'member-admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                            : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {membership.role === 'member-admin' ? 'Admin' : 'Member'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-xs rounded ${
                          membership.status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}
                      >
                        {membership.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSite(membership.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
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

interface CreateUserModalProps {
  readonly onClose: () => void
  readonly onSave: () => void
}

function CreateUserModal({ onClose, onSave }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    isSuperadmin: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.errors?.[0]?.message || 'Failed to create user')
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New User</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="create-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Name
              </label>
              <input
                id="create-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="create-surname"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Surname
              </label>
              <input
                id="create-surname"
                type="text"
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="create-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email *
            </label>
            <input
              id="create-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label
              htmlFor="create-password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password *
            </label>
            <input
              id="create-password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              required
              minLength={6}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="createIsSuperadmin"
              checked={formData.isSuperadmin}
              onChange={(e) => setFormData({ ...formData, isSuperadmin: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label
              htmlFor="createIsSuperadmin"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Superadmin
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
              {isLoading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Delete confirmation modal
interface DeleteUserModalProps {
  readonly user: User
  readonly membershipCount: number
  readonly onClose: () => void
  readonly onConfirm: () => void
  readonly isDeleting: boolean
}

function DeleteUserModal({
  user,
  membershipCount,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteUserModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Delete User</h2>

        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            Are you sure you want to delete <strong>{user.email}</strong>?
          </p>
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-600 dark:text-red-400">
              <strong>Warning:</strong> This will permanently delete:
            </p>
            <ul className="text-sm text-red-600 dark:text-red-400 mt-1 ml-4 list-disc">
              <li>The user account</li>
              {membershipCount > 0 && (
                <li>
                  {membershipCount} site membership{membershipCount === 1 ? '' : 's'}
                </li>
              )}
              <li>All related referrals</li>
              <li>All related one-to-one meetings</li>
              <li>All Top40 entries</li>
              <li>All success stories</li>
              <li>All special requests</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ITEMS_PER_PAGE = 10

export function UsersTable({ users, memberships, sites }: UsersTableProps) {
  const router = useRouter()
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [search, setSearch] = useState('')
  const [filterSuperadmin, setFilterSuperadmin] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)

  const handleSave = () => {
    setEditingUser(null)
    setShowCreate(false)
    setShowImport(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/superadmin/users/${deletingUser.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete user')
      }

      setDeletingUser(null)
      router.refresh()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete user')
    } finally {
      setIsDeleting(false)
    }
  }

  const getUserMembershipCount = (userId: number): number => {
    return memberships.filter((m) => {
      const memberUserId = typeof m.user === 'object' ? m.user?.id : m.user
      return memberUserId === userId
    }).length
  }

  // Get sites for a user based on memberships
  const getUserSites = (userId: number): Site[] => {
    const userMemberships = memberships.filter((m) => {
      const memberUserId = typeof m.user === 'object' ? m.user?.id : m.user
      return memberUserId === userId
    })
    return userMemberships
      .map((m) => {
        if (typeof m.site === 'object') return m.site as Site
        return sites.find((s) => s.id === m.site)
      })
      .filter((s): s is Site => s !== undefined)
  }

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      search === '' ||
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.surname?.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    const matchesSuperadmin =
      filterSuperadmin === '' ||
      (filterSuperadmin === 'yes' && user.isSuperadmin) ||
      (filterSuperadmin === 'no' && !user.isSuperadmin)
    return matchesSearch && matchesSuperadmin
  })

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleFilterChange = (value: string) => {
    setFilterSuperadmin(value)
    setCurrentPage(1)
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Users ({users.length})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              📥 Import from Excel
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              + New User
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-4 sm:px-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div>
              <select
                value={filterSuperadmin}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">All Users</option>
                <option value="yes">Superadmins Only</option>
                <option value="no">Non-Superadmins</option>
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
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sites
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Superadmin
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const userSites = getUserSites(user.id)
                  return (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name} {user.surname}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        {userSites.length === 0 ? (
                          <span className="text-sm text-gray-400">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {userSites.map((site) => (
                              <span
                                key={site.id}
                                className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              >
                                {site.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isSuperadmin ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            Superadmin
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingUser(user)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with pagination */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredUsers.length === 0 ? 0 : startIndex + 1}-
            {Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
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

      {editingUser && (
        <EditUserModal
          user={editingUser}
          sites={sites}
          memberships={memberships}
          onClose={() => setEditingUser(null)}
          onSave={handleSave}
        />
      )}

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onSave={handleSave} />}

      {showImport && (
        <UserImportModal
          sites={sites}
          onClose={() => setShowImport(false)}
          onSuccess={handleSave}
        />
      )}

      {deletingUser && (
        <DeleteUserModal
          user={deletingUser}
          membershipCount={getUserMembershipCount(deletingUser.id)}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </>
  )
}
