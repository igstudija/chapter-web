'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useTranslations } from './TranslationsProvider'

interface SpecialRequestModalProps {
  isOpen: boolean
  onClose: () => void
  editData?: {
    id: string | number
    request: string
    registrationNumber?: string | null
  } | null
  siteId?: string | number
}

export function SpecialRequestModal({ isOpen, onClose, editData, siteId }: SpecialRequestModalProps) {
  const router = useRouter()
  const { t } = useTranslations()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [request, setRequest] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')

  const isEditMode = !!editData

  useEffect(() => {
    if (editData) {
      setRequest(editData.request)
      setRegistrationNumber(editData.registrationNumber || '')
    } else {
      setRequest('')
      setRegistrationNumber('')
    }
  }, [editData])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = isEditMode ? `/api/special-requests/${editData.id}` : '/api/special-requests'
      const method = isEditMode ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request, registrationNumber, siteId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save request')
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
    <div className="modal-scrim">
      <button
        type="button"
        className="fixed inset-0"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className="modal-panel relative w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink dark:text-surface-text">
            {isEditMode ? t('specialRequest', 'editTitle') : t('specialRequest', 'addTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="alert alert-error mb-6" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="request"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('specialRequest', 'content')} *
            </label>
            <textarea
              id="request"
              name="request"
              required
              rows={4}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              className="field"
              placeholder={t('specialRequest', 'contentPlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="registrationNumber"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('specialRequest', 'regNumber')}
            </label>
            <input
              type="text"
              id="registrationNumber"
              name="registrationNumber"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              className="field"
              placeholder={t('specialRequest', 'regNumberPlaceholder')}
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t('specialRequest', 'regNumberHint')}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t('common', 'saving') : t('common', 'save')}
          </button>
        </form>
      </div>
    </div>
  )
}
