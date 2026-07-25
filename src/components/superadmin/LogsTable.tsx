'use client'

import { useState, useEffect, useCallback } from 'react'

interface LogEntry {
  timestamp: string
  level: 'error' | 'warn' | 'info'
  message: string
  context?: Record<string, unknown>
  stack?: string
}

interface LogFile {
  name: string
  size: number
  modified: string
}

const LEVEL_STYLES: Record<string, { badge: string; row: string }> = {
  error: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    row: 'bg-red-50/50 dark:bg-red-900/10',
  },
  warn: {
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    row: 'bg-yellow-50/50 dark:bg-yellow-900/10',
  },
  info: {
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    row: '',
  },
}

export function LogsTable() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [files, setFiles] = useState<LogFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterLevel, setFilterLevel] = useState<string>('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [limit, setLimit] = useState(100)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ limit: String(limit) })
      if (filterLevel) params.set('level', filterLevel)
      if (search) params.set('search', search)

      const response = await fetch(`/api/superadmin/logs?${params}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch logs')
      }

      const data = await response.json()
      setLogs(data.logs || [])
      setFiles(data.files || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [filterLevel, search, limit])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchLogs])

  const handleSearch = () => {
    setSearch(searchInput)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('lv-LV', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button onClick={fetchLogs} className="mt-2 text-sm text-red-600 dark:text-red-400 underline">
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label
            htmlFor="level-filter"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Level
          </label>
          <select
            id="level-filter"
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="limit-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Limit
          </label>
          <select
            id="limit-select"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="search-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Search
          </label>
          <div className="flex gap-2">
            <input
              id="search-input"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search messages, stack traces..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto (5s)
          </label>
        </div>
      </div>

      {/* Log Files Info */}
      {files.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-4">
          {files.map((f) => (
            <span key={f.name}>
              {f.name}: {formatSize(f.size)}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span className="text-gray-500 dark:text-gray-400">{logs.length} entries</span>
        <span className="text-red-600 dark:text-red-400">
          {logs.filter((l) => l.level === 'error').length} errors
        </span>
        <span className="text-yellow-600 dark:text-yellow-400">
          {logs.filter((l) => l.level === 'warn').length} warnings
        </span>
      </div>

      {/* Log Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-36">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
                  Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No log entries found
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => {
                  const style = LEVEL_STYLES[log.level] || LEVEL_STYLES.info
                  const hasDetails = log.context || log.stack
                  return (
                    <tr
                      key={`${log.timestamp}-${index}`}
                      className={`${style.row} hover:bg-gray-50 dark:hover:bg-gray-700/50`}
                    >
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${style.badge}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white max-w-xl truncate">
                        {log.message}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {hasDetails ? (
                          <button
                            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs"
                          >
                            {expandedIndex === index ? 'Hide' : 'View'}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded Details */}
        {expandedIndex !== null && logs[expandedIndex] && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Log Details — {logs[expandedIndex].timestamp}
            </h4>
            {logs[expandedIndex].context && (
              <div className="mb-3">
                <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Context</h5>
                <pre className="text-xs bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(logs[expandedIndex].context, null, 2)}
                </pre>
              </div>
            )}
            {logs[expandedIndex].stack && (
              <div>
                <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Stack Trace
                </h5>
                <pre className="text-xs bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto whitespace-pre-wrap font-mono text-red-700 dark:text-red-300">
                  {logs[expandedIndex].stack}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
