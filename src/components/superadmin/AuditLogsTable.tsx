'use client'

import { useState, useEffect, useCallback } from 'react'

interface AuditLog {
  id: string
  action: string
  performedBy?: { id: string; email: string; name?: string; surname?: string } | string
  performedByEmail?: string
  targetType?: string
  targetId?: string
  targetEmail?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  expiresAt: string
  createdAt: string
}

interface AuditLogsResponse {
  docs: AuditLog[]
  totalDocs: number
  totalPages: number
  page: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  user_deleted: {
    label: 'User Deleted',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  user_created: {
    label: 'User Created',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  user_updated: {
    label: 'User Updated',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  superadmin_login: {
    label: 'Superadmin Login',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
  superadmin_login_failed: {
    label: 'Login Failed',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  membership_created: {
    label: 'Membership Created',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  membership_deleted: {
    label: 'Membership Deleted',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  site_created: {
    label: 'Site Created',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  site_deleted: {
    label: 'Site Deleted',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
}

const ITEMS_PER_PAGE = 20

export function AuditLogsTable() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)
  const [filterAction, setFilterAction] = useState<string>('')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      })
      if (filterAction) {
        params.set('action', filterAction)
      }

      const response = await fetch(`/api/superadmin/audit-logs?${params}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch audit logs')
      }

      const data: AuditLogsResponse = await response.json()
      setLogs(data.docs)
      setTotalPages(data.totalPages)
      setTotalDocs(data.totalDocs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, filterAction])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('lv-LV', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getPerformedByDisplay = (log: AuditLog): string => {
    if (log.performedBy && typeof log.performedBy === 'object') {
      const user = log.performedBy
      const name = [user.name, user.surname].filter(Boolean).join(' ')
      return name ? `${name} (${user.email})` : user.email
    }
    return log.performedByEmail || '-'
  }

  const getActionBadge = (action: string) => {
    const config = ACTION_LABELS[action] || {
      label: action,
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const handleFilterChange = (action: string) => {
    setFilterAction(action)
    setCurrentPage(1)
  }

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            Loading...
          </td>
        </tr>
      )
    }

    if (logs.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            No audit logs found
          </td>
        </tr>
      )
    }

    return logs.map((log) => (
      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
          {formatDate(log.createdAt)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">{getActionBadge(log.action)}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          {getPerformedByDisplay(log)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
          {log.targetEmail || log.targetId || '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
          {log.ipAddress || '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          {log.details ? (
            <button
              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {expandedLog === log.id ? 'Hide' : 'View'}
            </button>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
      </tr>
    ))
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchLogs}
          className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label
            htmlFor="action-filter"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Filter by Action
          </label>
          <select
            id="action-filter"
            value={filterAction}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Actions</option>
            <option value="superadmin_login">Superadmin Login</option>
            <option value="superadmin_login_failed">Login Failed</option>
            <option value="user_deleted">User Deleted</option>
            <option value="user_created">User Created</option>
            <option value="user_updated">User Updated</option>
            <option value="membership_created">Membership Created</option>
            <option value="membership_deleted">Membership Deleted</option>
            <option value="site_created">Site Created</option>
            <option value="site_deleted">Site Deleted</option>
          </select>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400 self-end pb-2">
          {totalDocs} log entries
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Performed By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {renderTableBody()}
            </tbody>
          </table>
        </div>

        {/* Expanded Details */}
        {expandedLog && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Log Details
            </h4>
            <pre className="text-xs bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
              {JSON.stringify(logs.find((l) => l.id === expandedLog)?.details || {}, null, 2)}
            </pre>
            {logs.find((l) => l.id === expandedLog)?.userAgent && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                <strong>User Agent:</strong> {logs.find((l) => l.id === expandedLog)?.userAgent}
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
