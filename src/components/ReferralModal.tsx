'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useTranslations } from './TranslationsProvider'

interface Member {
  id: string | number
  name: string
  surname: string
}

interface ReferralModalProps {
  isOpen: boolean
  onClose: () => void
  members: Member[]
  currentUserId: string
  mode: 'give' | 'receive'
  editData?: {
    id: string | number
    fromUser: string | number
    toUser: string | number
    date: string
    description: string
    status?: string
    value?: number | null
  } | null
}

export function ReferralModal({
  isOpen,
  onClose,
  members,
  currentUserId,
  mode,
  editData,
}: ReferralModalProps) {
  const router = useRouter()
  const { t } = useTranslations()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fromUser, setFromUser] = useState('')
  const [toUser, setToUser] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [value, setValue] = useState('')

  const isEditMode = !!editData

  useEffect(() => {
    if (editData) {
      setFromUser(String(editData.fromUser))
      setToUser(String(editData.toUser))
      setDate(editData.date ? editData.date.split('T')[0] : '')
      setDescription(editData.description)
      setValue(editData.value?.toString() || '')
    } else {
      if (mode === 'give') {
        setFromUser(currentUserId)
        setToUser('')
      } else {
        setFromUser('')
        setToUser(currentUserId)
      }
      setDate(new Date().toISOString().split('T')[0])
      setDescription('')
      setValue('')
    }
  }, [editData, currentUserId, mode])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = isEditMode ? `/api/referrals/${editData.id}` : '/api/referrals'
      const method = isEditMode ? 'PATCH' : 'POST'

      const requestBody: Record<string, unknown> = {
        fromUser,
        toUser,
        date,
        description,
        status: 'pending',
      }

      // Include value if provided (only for receive mode)
      if (mode === 'receive' && value) {
        requestBody.value = parseFloat(value)
        requestBody.status = 'success'
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('profile', 'saveFailed'))
      }

      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login', 'errorOccurred'))
    } finally {
      setLoading(false)
    }
  }

  const title =
    mode === 'give'
      ? isEditMode
        ? t('activities', 'editReferralGiven')
        : t('activities', 'addReferralGiven')
      : isEditMode
        ? t('activities', 'editReferralReceived')
        : t('activities', 'addReferralReceived')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="fixed inset-0 bg-neutral-950/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className="relative bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink dark:text-surface-text">{title}</h2>
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
          {mode === 'give' ? (
            <div>
              <label
                htmlFor="toUser"
                className="block text-sm font-medium text-brand dark:text-brand mb-1"
              >
                {t('activities', 'referralTo')} *
              </label>
              <select
                id="toUser"
                name="toUser"
                required
                value={toUser}
                onChange={(e) => setToUser(e.target.value)}
                className="field"
              >
                <option value="">{t('activities', 'selectMember')}</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.surname}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label
                htmlFor="fromUser"
                className="block text-sm font-medium text-brand dark:text-brand mb-1"
              >
                {t('activities', 'referralFrom')} *
              </label>
              <select
                id="fromUser"
                name="fromUser"
                required
                value={fromUser}
                onChange={(e) => setFromUser(e.target.value)}
                className="field"
              >
                <option value="">{t('activities', 'selectMember')}</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.surname}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('activities', 'date')} *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('activities', 'referralDescription')} *
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="field"
              placeholder={t('activities', 'referralDescriptionPlaceholder')}
            />
          </div>

          {mode === 'receive' && (
            <div>
              <label
                htmlFor="value"
                className="block text-sm font-medium text-brand dark:text-brand mb-1"
              >
                {t('activities', 'referralValue')}
              </label>
              <input
                type="number"
                id="value"
                name="value"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="field"
                placeholder="0.00"
              />
            </div>
          )}

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
