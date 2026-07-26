'use client'

import { useState, useRef, useCallback } from 'react'
import { RichTextEditor } from './RichTextEditor'
import { useTranslations } from './TranslationsProvider'
import { Check } from 'lucide-react'

interface GroupSlideEditorProps {
  readonly powerGroupId: string | number
  readonly powerGroupTitle: string
  readonly initialDescription: string
}

export function GroupSlideEditor({
  powerGroupId,
  powerGroupTitle,
  initialDescription,
}: GroupSlideEditorProps) {
  const { t } = useTranslations()
  const [description, setDescription] = useState(initialDescription)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const originalRef = useRef(initialDescription)

  const handleSave = useCallback(async () => {
    if (description === originalRef.current) return

    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/power-groups/description', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ powerGroupId, description }),
      })
      if (res.ok) {
        const data = await res.json()
        originalRef.current = data.description
        setDescription(data.description)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }, [description, powerGroupId])

  const hasChanges = description !== originalRef.current

  return (
    <div>
      <h2 className="font-display mb-2 text-lg font-bold tracking-tight text-ink dark:text-surface-text">
        {powerGroupTitle}
      </h2>
      <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
        {t('profile', 'groupSlideDescription')}
      </label>
      <RichTextEditor
        value={description}
        onChange={setDescription}
        height={200}
        toolbar="bold italic | bullist | removeformat"
        plugins={['lists', 'autoresize']}
      />
      <div className="flex items-center gap-3 mt-4">
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {saving ? '...' : t('common', 'save')}
          </button>
        )}
        {saved && (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
            <Check className="h-4 w-4" />
            {t('profile', 'groupSlideSaved')}
          </span>
        )}
      </div>
    </div>
  )
}
