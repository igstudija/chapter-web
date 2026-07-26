'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { RichTextEditor } from './RichTextEditor'
import { useTranslations } from './TranslationsProvider'

interface Member {
  id: string | number
  name: string
  surname: string
}

interface SuccessStoryModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly members?: ReadonlyArray<Member>
  readonly editData?: {
    id: string | number
    title: string
    story: string
    businessValue?: string | null
    partnerMember?: string | number | null
  } | null
  readonly siteId?: string | number
}

export function SuccessStoryModal({
  isOpen,
  onClose,
  members = [],
  editData,
  siteId,
}: SuccessStoryModalProps) {
  const router = useRouter()
  const { t } = useTranslations()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [story, setStory] = useState('')
  const [businessValue, setBusinessValue] = useState('')
  const [partnerMember, setPartnerMember] = useState('')

  const isEditMode = !!editData

  useEffect(() => {
    if (editData) {
      setTitle(editData.title)
      setStory(editData.story)
      setBusinessValue(editData.businessValue || '')
      setPartnerMember(editData.partnerMember ? String(editData.partnerMember) : '')
    } else {
      setTitle('')
      setStory('')
      setBusinessValue('')
      setPartnerMember('')
    }
  }, [editData])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = isEditMode ? `/api/success-stories/${editData.id}` : '/api/success-stories'
      const method = isEditMode ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          story,
          businessValue,
          partnerMember: partnerMember || null,
          siteId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save success story')
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
        className="fixed inset-0 bg-neutral-950/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className="relative bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink dark:text-surface-text">
            {isEditMode ? t('successStory', 'editTitle') : t('successStory', 'addTitle')}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('successStory', 'title')} *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field"
              placeholder={t('successStory', 'titlePlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="story"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('successStory', 'story')} *
            </label>
            <RichTextEditor
              value={story}
              onChange={setStory}
              placeholder={t('successStory', 'storyPlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="businessValue"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('successStory', 'businessValue')}
            </label>
            <input
              type="text"
              id="businessValue"
              name="businessValue"
              value={businessValue}
              onChange={(e) => setBusinessValue(e.target.value)}
              className="field"
              placeholder={t('successStory', 'businessValuePlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="partnerMember"
              className="block text-sm font-medium text-brand dark:text-brand mb-1"
            >
              {t('successStory', 'partnerMember')}
            </label>
            <select
              id="partnerMember"
              name="partnerMember"
              value={partnerMember}
              onChange={(e) => setPartnerMember(e.target.value)}
              className="field"
            >
              <option value="">{t('successStory', 'selectPartner')}</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} {member.surname}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t('successStory', 'partnerInDeal')}
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
