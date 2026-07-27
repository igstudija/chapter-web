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

interface OneToOneMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  members: Member[]
  currentUserId: string
  editData?: {
    id: string | number
    metWith: string | number
    invitedBy: string | number
    location: string
    topics: string
    date: string
  } | null
}

export function OneToOneMeetingModal({
  isOpen,
  onClose,
  members,
  currentUserId,
  editData,
}: OneToOneMeetingModalProps) {
  const router = useRouter()
  const { t } = useTranslations()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [metWith, setMetWith] = useState('')
  const [invitedBy, setInvitedBy] = useState('')
  const [location, setLocation] = useState('')
  const [topics, setTopics] = useState('')
  const [date, setDate] = useState('')

  const isEditMode = !!editData

  useEffect(() => {
    if (editData) {
      setMetWith(String(editData.metWith))
      setInvitedBy(String(editData.invitedBy))
      setLocation(editData.location)
      setTopics(editData.topics)
      setDate(editData.date ? editData.date.split('T')[0] : '')
    } else {
      setMetWith('')
      setInvitedBy(currentUserId)
      setLocation('')
      setTopics('')
      setDate(new Date().toISOString().split('T')[0])
    }
  }, [editData, currentUserId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = isEditMode
        ? `/api/one-to-one-meetings/${editData.id}`
        : '/api/one-to-one-meetings'
      const method = isEditMode ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metWith, invitedBy, location, topics, date }),
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
            {isEditMode ? t('activities', 'editMeeting') : t('activities', 'addMeeting')}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="metWith"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('activities', 'metWith')} *
            </label>
            <select
              id="metWith"
              name="metWith"
              required
              value={metWith}
              onChange={(e) => setMetWith(e.target.value)}
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

          <div>
            <label
              htmlFor="invitedBy"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('activities', 'invitedBy')} *
            </label>
            <select
              id="invitedBy"
              name="invitedBy"
              required
              value={invitedBy}
              onChange={(e) => setInvitedBy(e.target.value)}
              className="field"
            >
              <option value="">{t('activities', 'selectMember')}</option>
              {[...members, { id: currentUserId, name: t('activities', 'me'), surname: '' }].map(
                (member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.surname}
                  </option>
                )
              )}
            </select>
          </div>

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
              htmlFor="location"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('activities', 'location')} *
            </label>
            <input
              type="text"
              id="location"
              name="location"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="field"
              placeholder={t('activities', 'locationPlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="topics"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('activities', 'topics')} *
            </label>
            <textarea
              id="topics"
              name="topics"
              required
              rows={3}
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              className="field"
              placeholder={t('activities', 'topicsPlaceholder')}
            />
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
