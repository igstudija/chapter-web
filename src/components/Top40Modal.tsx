'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useTranslations } from './TranslationsProvider'

interface Top40ModalProps {
  isOpen: boolean
  onClose: () => void
  editData?: {
    id: string | number
    companyName: string
    contactPerson?: string | null
    position?: string | null
    registrationNumber?: string | null
    notes?: string | null
    businessTags?: string | null
  } | null
  siteId?: string | number
  /** API base for create/update; defaults to the Top 40 endpoint. */
  apiBase?: string
  /** Optional title overrides (e.g. for the Top 20 variant). */
  addTitle?: string
  editTitle?: string
  /** Whether the contact person field is required (default true). */
  requireContactPerson?: boolean
}

export function Top40Modal({
  isOpen,
  onClose,
  editData,
  siteId,
  apiBase = '/api/top40',
  addTitle,
  editTitle,
  requireContactPerson = true,
}: Top40ModalProps) {
  const router = useRouter()
  const { t } = useTranslations()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    contactPerson: '',
    position: '',
    companyName: '',
    registrationNumber: '',
    notes: '',
  })
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const tagInputRef = useRef<HTMLInputElement>(null)

  const isEditMode = !!editData

  useEffect(() => {
    if (editData) {
      setFormData({
        contactPerson: editData.contactPerson || '',
        position: editData.position || '',
        companyName: editData.companyName,
        registrationNumber: editData.registrationNumber || '',
        notes: editData.notes || '',
      })
      setTags(
        editData.businessTags
          ? editData.businessTags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      )
    } else {
      setFormData({
        contactPerson: '',
        position: '',
        companyName: '',
        registrationNumber: '',
        notes: '',
      })
      setTags([])
    }
    setTagInput('')
  }, [editData])

  if (!isOpen) return null

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const addTag = (value: string) => {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed])
    }
    setTagInput('')
  }

  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = isEditMode ? `${apiBase}/${editData.id}` : apiBase
      const method = isEditMode ? 'PATCH' : 'POST'

      const businessTags = tags.join(', ')

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, businessTags, siteId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save entry')
      }

      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login', 'errorOccurred'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="fixed inset-0 bg-neutral-600/50"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className="relative bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-ink dark:text-surface-text">
            {isEditMode
              ? editTitle ?? t('top40', 'editTitle')
              : addTitle ?? t('top40', 'addTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="contactPerson"
              className={`block text-sm font-medium mb-1 ${
                requireContactPerson
                  ? 'text-brand dark:text-brand'
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {t('top40', 'contactPerson')}
              {requireContactPerson && ' *'}
            </label>
            <input
              type="text"
              id="contactPerson"
              name="contactPerson"
              required={requireContactPerson}
              value={formData.contactPerson}
              onChange={handleChange}
              className="w-full border border-neutral-300 dark:border-neutral-600 bg-white text-ink dark:bg-surface dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder={t('top40', 'contactPersonPlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="position"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('top40', 'position')}
            </label>
            <input
              type="text"
              id="position"
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full border border-neutral-300 dark:border-neutral-600 bg-white text-ink dark:bg-surface dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder={t('top40', 'positionPlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="companyName"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('top40', 'companyName')} *
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              required
              value={formData.companyName}
              onChange={handleChange}
              className="w-full border border-neutral-300 dark:border-neutral-600 bg-white text-ink dark:bg-surface dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder={t('top40', 'companyNamePlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="registrationNumber"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('top40', 'regNumber')}
            </label>
            <input
              type="text"
              id="registrationNumber"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleChange}
              className="w-full border border-neutral-300 dark:border-neutral-600 bg-white text-ink dark:bg-surface dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder={t('top40', 'regNumberPlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('top40', 'notes')}
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              className="w-full border border-neutral-300 dark:border-neutral-600 bg-white text-ink dark:bg-surface dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
              placeholder={t('top40', 'notesPlaceholder')}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('top40', 'tags')}
            </label>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1.5">
              {t('top40', 'tagsHint')}
            </p>
            <div
              className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-brand focus-within:border-transparent cursor-text"
              onClick={() => tagInputRef.current?.focus()}
            >
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 px-2 py-1 rounded"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeTag(i)
                      }}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
                  className="flex-1 min-w-[120px] bg-transparent text-ink dark:text-surface-text text-sm outline-none py-0.5"
                  placeholder={tags.length === 0 ? t('top40', 'tagsPlaceholder') : ''}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white py-3 rounded-lg hover:bg-brand-dark transition-colors font-semibold disabled:opacity-50"
          >
            {loading ? t('common', 'saving') : t('common', 'save')}
          </button>
        </form>
      </div>
    </div>
  )
}
