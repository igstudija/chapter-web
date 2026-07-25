'use client'

import { useState, useEffect } from 'react'
import type { AiSetting, Site } from '@/payload-types'

interface AiContextPreview {
  siteName: string
  members: string
  top40: string
  fullSystemPrompt: string | null
}

export function AiSettingsTable() {
  const [settings, setSettings] = useState<AiSetting | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Context preview state
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [contextPreview, setContextPreview] = useState<AiContextPreview | null>(null)
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const [contextError, setContextError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const [formData, setFormData] = useState({
    label: 'Default AI Configuration',
    enabled: false,
    openaiApiKey: '',
    model: 'gpt-4o-mini' as string,
    systemPrompt: '',
    maxTokens: 1024,
    temperature: 0.7,
  })

  useEffect(() => {
    fetchSettings()
    fetchSites()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai-settings?limit=1')
      if (response.ok) {
        const data = await response.json()
        if (data.docs && data.docs.length > 0) {
          const doc = data.docs[0] as AiSetting
          setSettings(doc)
          setFormData({
            label: doc.label,
            enabled: doc.enabled || false,
            openaiApiKey: doc.openaiApiKey,
            model: doc.model,
            systemPrompt: doc.systemPrompt,
            maxTokens: doc.maxTokens,
            temperature: doc.temperature,
          })
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI settings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/sites?limit=100&sort=name')
      if (response.ok) {
        const data = await response.json()
        setSites(data.docs || [])
      }
    } catch (err) {
      console.error('Failed to fetch sites:', err)
    }
  }

  const loadContext = async () => {
    if (!selectedSiteId) return
    setIsLoadingContext(true)
    setContextError(null)
    setContextPreview(null)

    try {
      const response = await fetch(`/api/superadmin/ai-context?siteId=${selectedSiteId}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load context')
      }
      const data = await response.json()
      setContextPreview(data)
    } catch (err) {
      setContextError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoadingContext(false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const url = settings
        ? `/api/ai-settings/${settings.id}`
        : '/api/ai-settings'
      const method = settings ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.errors?.[0]?.message || 'Failed to save settings')
      }

      const data = await response.json()
      setSettings(settings ? data.doc : data.doc)
      setSuccess(settings ? 'Settings updated successfully' : 'Settings created successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg px-6 py-8 text-center text-gray-500 dark:text-gray-400">
        Loading AI settings...
      </div>
    )
  }

  const renderContextSection = (title: string, key: string, content: string) => {
    const isExpanded = expandedSections[key]
    const lineCount = content.split('\n').length
    return (
      <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection(key)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-650 text-left"
        >
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {title}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {lineCount} lines {isExpanded ? '▲' : '▼'}
          </span>
        </button>
        {isExpanded && (
          <pre className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap wrap-break-word">
            {content}
          </pre>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
          AI Chatbot Settings
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure OpenAI API key, model, system prompt, and other chatbot parameters
        </p>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Enabled toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-gray-500 peer-checked:bg-blue-600" />
            </label>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Enable AI Chatbot
            </span>
            {formData.enabled && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Active
              </span>
            )}
          </div>

          {/* Label */}
          <div>
            <label htmlFor="ai-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Label
            </label>
            <input
              id="ai-label"
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Internal label for this configuration</p>
          </div>

          {/* API Key */}
          <div>
            <label htmlFor="ai-apikey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              OpenAI API Key *
            </label>
            <input
              id="ai-apikey"
              type="password"
              value={formData.openaiApiKey}
              onChange={(e) => setFormData({ ...formData, openaiApiKey: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white font-mono"
              required
              placeholder="sk-..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Stored securely, never exposed to client</p>
          </div>

          {/* Model */}
          <div>
            <label htmlFor="ai-model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Model *
            </label>
            <select
              id="ai-model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            >
              <option value="gpt-4.1-nano">GPT-4.1 Nano ($0.10/$0.40)</option>
              <option value="gpt-4o-mini">GPT-4o Mini ($0.15/$0.60)</option>
              <option value="gpt-4.1-mini">GPT-4.1 Mini ($0.40/$1.60)</option>
              <option value="o3-mini">o3-mini ($1.10/$4.40)</option>
              <option value="o4-mini">o4-mini ($1.10/$4.40)</option>
              <option value="gpt-5">GPT-5 ($1.25/$10)</option>
              <option value="o3">o3 ($2/$8)</option>
              <option value="gpt-4.1">GPT-4.1 ($2/$8)</option>
              <option value="gpt-4o">GPT-4o ($2.50/$10)</option>
            </select>
          </div>

          {/* System Prompt */}
          <div>
            <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              System Prompt *
            </label>
            <textarea
              id="ai-prompt"
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              rows={6}
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Defines AI behaviour and which topics the assistant will answer. Organisation data (members, requests, top lists) is added automatically.
            </p>
          </div>

          {/* Max Tokens & Temperature */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ai-tokens" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Tokens
              </label>
              <input
                id="ai-tokens"
                type="number"
                value={formData.maxTokens}
                onChange={(e) => setFormData({ ...formData, maxTokens: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                min={100}
                max={4096}
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">100-4096</p>
            </div>
            <div>
              <label htmlFor="ai-temp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Temperature
              </label>
              <input
                id="ai-temp"
                type="number"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                min={0}
                max={2}
                step={0.1}
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">0 = deterministic, 2 = creative. Recommended: 0.7</p>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : settings ? 'Update Settings' : 'Create Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Context Preview Panel */}
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
          AI Context Preview
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Preview what data gets sent to the AI for each site (members, Top40)
        </p>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <label htmlFor="context-site" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Site
            </label>
            <select
              id="context-site"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            >
              <option value="">-- Select a site --</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={loadContext}
            disabled={!selectedSiteId || isLoadingContext}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
          >
            {isLoadingContext ? 'Loading...' : 'Load Context'}
          </button>
        </div>

        {contextError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{contextError}</p>
          </div>
        )}

        {contextPreview && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Context for: <span className="text-blue-600 dark:text-blue-400">{contextPreview.siteName}</span>
            </p>

            {renderContextSection('Members (Biedri)', 'members', contextPreview.members)}
            {renderContextSection('Top40', 'top40', contextPreview.top40)}

            {contextPreview.fullSystemPrompt && (
              renderContextSection('Full System Prompt (sent to AI)', 'fullPrompt', contextPreview.fullSystemPrompt)
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  )
}
