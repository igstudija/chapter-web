'use client'

import { useState, useRef, useEffect } from 'react'
import type { Site } from '@/payload-types'

interface LogEntry {
  type: 'start' | 'processing' | 'success' | 'skip' | 'error' | 'complete' | 'info'
  message: string
  company?: string
  tags?: string[]
  processed?: number
  total?: number
  updated?: number
  skipped?: number
  errors?: number
}

interface PerplexityToolsTableProps {
  sites: Site[]
}

export function PerplexityToolsTable({ sites }: PerplexityToolsTableProps) {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('sonar-pro')
  const [siteId, setSiteId] = useState('all')
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/superadmin/ai-settings')
        if (response.ok) {
          const data = await response.json()
          if (data.perplexityApiKey) {
            setApiKey(data.perplexityApiKey)
          }
          if (data.perplexityModel) {
            setModel(data.perplexityModel)
          }
        }
      } catch (error) {
        console.error('Failed to load AI settings:', error)
      } finally {
        setIsLoadingSettings(false)
      }
    }
    loadSettings()
  }, [])

  // Save settings to database
  const saveSettings = async (newApiKey?: string, newModel?: string) => {
    setIsSaving(true)
    try {
      await fetch('/api/superadmin/ai-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perplexityApiKey: newApiKey ?? apiKey,
          perplexityModel: newModel ?? model,
        }),
      })
    } catch (error) {
      console.error('Failed to save AI settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle API key change with debounced save
  const handleApiKeyChange = (value: string) => {
    setApiKey(value)
  }

  // Save on blur
  const handleApiKeyBlur = () => {
    if (apiKey) {
      saveSettings(apiKey, undefined)
    }
  }

  // Handle model change
  const handleModelChange = (value: string) => {
    setModel(value)
    saveSettings(undefined, value)
  }
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [progress, setProgress] = useState({ processed: 0, total: 0 })
  const logContainerRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setLogs((prev) => [...prev, { type: 'error', message: '🛑 Process apturēts lietotāja pieprasījuma dēļ' }])
      setIsRunning(false)
    }
  }

  const handleStart = async () => {
    if (!apiKey) {
      alert('Lūdzu ievadiet Perplexity API atslēgu')
      return
    }

    setIsRunning(true)
    setProgress({ processed: 0, total: 0 })

    // Get site name for display
    const selectedSiteName = siteId === 'all'
      ? 'Visas vietnes'
      : sites.find(s => String(s.id) === siteId)?.name || siteId

    // Show initial config info
    setLogs([
      {
        type: 'info',
        message: `⚙️ Modelis: ${model} | Vietne: ${selectedSiteName} | API: ${apiKey.slice(0, 8)}...`
      }
    ])

    // Create abort controller for stopping
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/superadmin/generate-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          model,
          siteId,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const error = await response.json()
        setLogs((prev) => [
          ...prev,
          { type: 'error', message: `Kļūda: ${error.error || 'Nezināma kļūda'}` },
        ])
        setIsRunning(false)
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        setLogs((prev) => [...prev, { type: 'error', message: 'Neizdevās izveidot savienojumu' }])
        setIsRunning(false)
        return
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as LogEntry
              setLogs((prev) => [...prev, data])

              if (data.processed !== undefined && data.total !== undefined) {
                setProgress({ processed: data.processed, total: data.total })
              }

              if (data.type === 'complete') {
                setIsRunning(false)
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Already handled in handleStop
        return
      }
      setLogs((prev) => [...prev, { type: 'error', message: `Savienojuma kļūda: ${error}` }])
      setIsRunning(false)
    }
  }

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
      case 'skip':
        return 'text-yellow-400'
      case 'processing':
        return 'text-blue-400'
      case 'complete':
        return 'text-purple-400 font-bold'
      case 'info':
        return 'text-cyan-400'
      case 'start':
        return 'text-cyan-400'
      default:
        return 'text-gray-300'
    }
  }

  const progressPercent =
    progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Perplexity AI - Top40 Tagu Ģenerators
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Šis rīks izmanto Perplexity AI, lai automātiski meklētu informāciju par uzņēmumiem un
          ģenerētu relevantus biznesa tagus.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* API Key */}
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Perplexity API Atslēga
            </label>
            <div className="relative">
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                onBlur={handleApiKeyBlur}
                placeholder={isLoadingSettings ? 'Ielādē...' : 'pplx-...'}
                disabled={isRunning || isLoadingSettings}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
              {isSaving && (
                <span className="absolute right-3 top-2.5 text-xs text-gray-400">Saglabā...</span>
              )}
            </div>
          </div>

          {/* Model Select */}
          <div>
            <label
              htmlFor="model"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Modelis
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={isRunning || isLoadingSettings}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="sonar-pro">sonar-pro (~$0.01/uzņēmums)</option>
              <option value="sonar">sonar (~$0.001/uzņēmums)</option>
            </select>
          </div>

          {/* Site Select */}
          <div>
            <label
              htmlFor="site"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Vietne
            </label>
            <select
              id="site"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              disabled={isRunning || isLoadingSettings}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="all">Visas vietnes</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleStart}
            disabled={isRunning || !apiKey || isLoadingSettings}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingSettings ? 'Ielādē iestatījumus...' : isRunning ? 'Notiek apstrāde...' : 'Sākt Ģenerēšanu'}
          </button>
          {isRunning && (
            <button
              onClick={handleStop}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Apturēt
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {progress.total > 0 && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>
              {progress.processed} / {progress.total} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Log Output */}
      <div
        ref={logContainerRef}
        className="bg-gray-900 p-4 h-96 overflow-y-auto font-mono text-sm"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 italic">
            Logs parādīsies šeit, kad sāksiet ģenerēšanu...
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={`${getLogColor(log.type)} mb-2`}>
              {/* Progress indicator */}
              {log.processed !== undefined && log.total !== undefined && (
                <span className="text-gray-500 mr-2">[{log.processed}/{log.total}]</span>
              )}

              {/* Main message */}
              {(log.type === 'info' || log.type === 'start') ? (
                <span className="block py-1 border-b border-gray-700 mb-2">{log.message}</span>
              ) : log.type === 'complete' ? (
                <span className="block py-2 border-t border-gray-700 mt-2 font-bold">{log.message}</span>
              ) : log.type === 'success' && log.company ? (
                <>
                  <span className="text-green-400">✅ </span>
                  <span className="text-white font-semibold">{log.company}</span>
                  <span className="text-green-400"> - {log.tags?.length || 0} tagi pievienoti</span>
                </>
              ) : log.type === 'skip' && log.company ? (
                <>
                  <span className="text-yellow-400">⏭️ </span>
                  <span className="text-white font-semibold">{log.company}</span>
                  <span className="text-yellow-400"> - izlaists (jau ir tagi)</span>
                </>
              ) : log.type === 'processing' && log.company ? (
                <>
                  <span className="text-blue-400">🔍 </span>
                  <span className="text-white">{log.company}</span>
                  <span className="text-blue-400"> - meklē informāciju...</span>
                </>
              ) : log.type === 'error' && log.company ? (
                <>
                  <span className="text-red-400">❌ </span>
                  <span className="text-white font-semibold">{log.company}</span>
                  <span className="text-red-400"> - kļūda</span>
                </>
              ) : (
                <span>{log.message}</span>
              )}

              {/* Tags list for successful entries */}
              {log.type === 'success' && log.tags && log.tags.length > 0 && (
                <div className="ml-6 mt-1 text-gray-400 text-xs">
                  {log.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-block bg-gray-700 text-gray-300 px-2 py-0.5 rounded mr-1 mb-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
