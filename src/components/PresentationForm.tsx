'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, HelpCircle, X, Maximize2, Minimize2 } from 'lucide-react'
import { useTranslations } from './TranslationsProvider'
import { slideImageHelp } from './slideImageHelp'
import { resizeImage, resizePresets } from '@/lib/resizeImage'

interface PresentationFormProps {
  readonly initialData: {
    readonly tyfcbGiven: number | null
    readonly tyfcbReceived: number | null
    readonly slideImageUrl: string | null
    readonly slideImageId: string | null
    readonly slideBackgroundColor?: string
    readonly slideImageMode?: 'contain' | 'cover'
    readonly profileImageUrl: string | null
    readonly logoUrl: string | null
    readonly name: string
    readonly surname: string
    readonly company: string
  }
  readonly siteId?: string
  readonly businessGivenMin?: number
  readonly businessReceivedMin?: number
  readonly onColorChange?: (color: string) => void
  readonly onImageModeChange?: (mode: 'contain' | 'cover') => void
  readonly onImageChange?: (imageUrl: string | null) => void
  readonly onTyfcbChange?: (field: 'tyfcbGiven' | 'tyfcbReceived', value: number | null) => void
}

export function PresentationForm({
  initialData,
  siteId,
  businessGivenMin = 0,
  businessReceivedMin = 0,
  onColorChange,
  onImageModeChange,
  onImageChange,
  onTyfcbChange,
}: PresentationFormProps) {
  const router = useRouter()
  const { t } = useTranslations()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tyfcbGiven, setTyfcbGiven] = useState<number | null>(initialData.tyfcbGiven)
  const [tyfcbReceived, setTyfcbReceived] = useState<number | null>(initialData.tyfcbReceived)
  const [slideImageUrl, setSlideImageUrl] = useState(initialData.slideImageUrl)
  const [slideImageId, setSlideImageId] = useState(initialData.slideImageId)
  const [slideBackgroundColor, setSlideBackgroundColor] = useState(
    initialData.slideBackgroundColor || '#ffffff',
  )
  const [slideImageMode, setSlideImageMode] = useState(initialData.slideImageMode || 'contain')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Detect language from messages
  const { messages } = useTranslations()
  const isLatvian = messages.common?.home === 'Sākums'
  const helpText = isLatvian ? slideImageHelp.lv : slideImageHelp.en

  // Handle dialog open/close with native dialog methods
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (showHelp) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [showHelp])

  // Modal focus management and keyboard handling
  useEffect(() => {
    if (!showHelp) return

    // Focus the dialog when it opens
    const dialog = dialogRef.current
    if (dialog) {
      const firstButton = dialog.querySelector('button')
      if (firstButton instanceof HTMLElement) {
        firstButton.focus()
      }
    }

    // Handle Escape key globally
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowHelp(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showHelp])

  // Track original values to detect changes
  const originalGiven = useRef(initialData.tyfcbGiven)
  const originalReceived = useRef(initialData.tyfcbReceived)
  const originalColor = useRef(initialData.slideBackgroundColor || '#ffffff')
  const originalImageMode = useRef(initialData.slideImageMode || 'contain')

  // Save field on blur (when user leaves the input)
  const handleFieldBlur = async (field: 'tyfcbGiven' | 'tyfcbReceived') => {
    const currentValue = field === 'tyfcbGiven' ? tyfcbGiven : tyfcbReceived
    const originalValue = field === 'tyfcbGiven' ? originalGiven.current : originalReceived.current

    // Only save if value changed
    if (currentValue === originalValue) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          [field]: currentValue,
          siteId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      // Update original value after successful save
      if (field === 'tyfcbGiven') {
        originalGiven.current = currentValue
      } else {
        originalReceived.current = currentValue
      }

      router.refresh()
    } catch {
      setError(t('profile', 'saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      // Resize image on client side before upload
      const resizedFile = await resizeImage(file, resizePresets.hero)

      // Upload resized file to media
      const formData = new FormData()
      formData.append('file', resizedFile)

      const uploadResponse = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Upload failed')
      }

      const uploadedMedia = await uploadResponse.json()
      const newMediaId = uploadedMedia.doc.id

      // Update membership with new slide image
      const updateResponse = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          slideImage: newMediaId,
          siteId,
        }),
      })

      if (!updateResponse.ok) {
        throw new Error('Failed to update user')
      }

      // Delete old media file if it existed
      if (slideImageId) {
        try {
          await fetch(`/api/media/${slideImageId}`, {
            method: 'DELETE',
            credentials: 'include',
          })
        } catch {
          // Ignore deletion errors - old file may already be deleted
          console.warn('Could not delete old slide image')
        }
      }

      setSlideImageUrl(uploadedMedia.doc.url)
      setSlideImageId(newMediaId)
      onImageChange?.(uploadedMedia.doc.url)
      router.refresh()
    } catch {
      setError(t('profile', 'uploadFailed'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const hasExistingImage = !!slideImageUrl

  const formatMinAmount = (value: number) =>
    `${new Intl.NumberFormat('lv-LV', { maximumFractionDigits: 0 }).format(value)} €`
  const minHint = (min: number) =>
    t('profile', 'minBusinessHint').replace('{amount}', formatMinAmount(min))

  return (
    <div className="panel p-6">
      {/* Error Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {/* All Settings in One Row */}
      <div>
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
          {/* Left side: TYFCB Fields */}
          <div className="flex gap-4 items-end">
            {/* TYFCB Given */}
            <div>
              <label
                htmlFor="tyfcbGiven"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('profile', 'businessGiven')}
              </label>
              <input
                type="number"
                id="tyfcbGiven"
                value={tyfcbGiven ?? ''}
                onChange={(e) => {
                  if (e.target.value === '') { setTyfcbGiven(null); onTyfcbChange?.('tyfcbGiven', null); return }
                  const num = Number(e.target.value)
                  if (num > 99000000) return
                  setTyfcbGiven(num)
                  onTyfcbChange?.('tyfcbGiven', num)
                }}
                min={0}
                max={99000000}
                className="w-36 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-neutral-900 dark:text-surface-text rounded-lg px-4 py-2"
              />
              {businessGivenMin > 0 && (
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-36">
                  {minHint(businessGivenMin)}
                </p>
              )}
            </div>

            {/* TYFCB Received */}
            <div>
              <label
                htmlFor="tyfcbReceived"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('profile', 'businessReceived')}
              </label>
              <input
                type="number"
                id="tyfcbReceived"
                value={tyfcbReceived ?? ''}
                onChange={(e) => {
                  if (e.target.value === '') { setTyfcbReceived(null); onTyfcbChange?.('tyfcbReceived', null); return }
                  const num = Number(e.target.value)
                  if (num > 99000000) return
                  setTyfcbReceived(num)
                  onTyfcbChange?.('tyfcbReceived', num)
                }}
                min={0}
                max={99000000}
                className="w-36 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-neutral-900 dark:text-surface-text rounded-lg px-4 py-2"
              />
              {businessReceivedMin > 0 && (
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-36">
                  {minHint(businessReceivedMin)}
                </p>
              )}
            </div>

            {/* Save Button - only show if values changed */}
            {(tyfcbGiven !== originalGiven.current ||
              tyfcbReceived !== originalReceived.current) && (
              <button
                type="button"
                onClick={async () => {
                  await handleFieldBlur('tyfcbGiven')
                  await handleFieldBlur('tyfcbReceived')
                }}
                disabled={saving}
                className="btn btn-primary h-10 px-4 py-0 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('common', 'saving')}</span>
                  </>
                ) : (
                  <span>{t('common', 'save')}</span>
                )}
              </button>
            )}
          </div>

          {/* Right side: Slide Settings */}
          <div className="flex flex-wrap gap-4 items-end justify-end">
            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t('common', 'background')}
              </label>
              <div className="flex gap-2">
                <div className="relative">
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={slideBackgroundColor}
                    onChange={(e) => {
                      setSlideBackgroundColor(e.target.value)
                      onColorChange?.(e.target.value)
                    }}
                    className="absolute opacity-0 w-0 h-0"
                  />
                  <button
                    type="button"
                    onClick={() => colorInputRef.current?.click()}
                    className="h-10 w-10 flex items-center justify-center border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    title={slideBackgroundColor}
                  >
                    <div
                      className="w-6 h-6 rounded border border-neutral-300 dark:border-neutral-500"
                      style={{ backgroundColor: slideBackgroundColor }}
                    />
                  </button>
                </div>
                <input
                  type="text"
                  value={slideBackgroundColor}
                  onChange={(e) => {
                    const v = e.target.value
                    // Allow typing in progress (partial hex codes)
                    if (v === '' || /^#[0-9a-fA-F]{0,6}$/.test(v)) {
                      setSlideBackgroundColor(v)
                      if (/^#[0-9a-fA-F]{6}$/.test(v)) onColorChange?.(v)
                    }
                  }}
                  onBlur={() => {
                    if (!/^#[0-9a-fA-F]{6}$/.test(slideBackgroundColor)) {
                      setSlideBackgroundColor('#ffffff')
                      onColorChange?.('#ffffff')
                    }
                  }}
                  className="w-[90px] border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-neutral-900 dark:text-surface-text rounded-lg px-3 py-2 font-mono text-xs"
                  placeholder="#ffffff"
                  maxLength={7}
                />
              </div>
            </div>

            {/* Slide Image Upload */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t('presentation', 'image')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-4 py-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50 h-10"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span className="text-sm">
                    {hasExistingImage ? t('presentation', 'update') : t('presentation', 'upload')}
                  </span>
                </button>
              </div>
            </div>

            {/* Image Mode Buttons */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t('presentation', 'position')}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSlideImageMode('contain')
                    onImageModeChange?.('contain')
                  }}
                  className={`h-10 w-10 flex items-center justify-center rounded-lg border-2 transition-all ${
                    slideImageMode === 'contain'
                      ? 'border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
                  }`}
                  title={t('common', 'contain')}
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSlideImageMode('cover')
                    onImageModeChange?.('cover')
                  }}
                  className={`h-10 w-10 flex items-center justify-center rounded-lg border-2 transition-all ${
                    slideImageMode === 'cover'
                      ? 'border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
                  }`}
                  title={t('common', 'cover')}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Save Slide Settings Button */}
            {(slideBackgroundColor !== originalColor.current ||
              slideImageMode !== originalImageMode.current) && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={async () => {
                    setSaving(true)
                    setError(null)
                    try {
                      const updateData: Record<string, string | undefined> = { siteId }
                      if (slideBackgroundColor !== originalColor.current) {
                        updateData.slideBackgroundColor = slideBackgroundColor
                      }
                      if (slideImageMode !== originalImageMode.current) {
                        updateData.slideImageMode = slideImageMode
                      }
                      const response = await fetch('/api/users/me', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(updateData),
                      })
                      if (!response.ok) throw new Error('Failed to save')
                      originalColor.current = slideBackgroundColor
                      originalImageMode.current = slideImageMode
                      router.refresh()
                    } catch {
                      setError(t('profile', 'saveFailed'))
                    } finally {
                      setSaving(false)
                    }
                  }}
                  disabled={saving}
                  className="btn btn-primary h-10 px-4 py-0 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('common', 'saving')}</span>
                    </>
                  ) : (
                    <span>{t('common', 'save')}</span>
                  )}
                </button>
              </div>
            )}

            {/* Help Button - Last */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="h-10 w-10 flex items-center justify-center text-red-600 hover:text-red-700 transition-colors rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700"
                title="Image requirements"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Help Modal */}
      <dialog
        ref={dialogRef}
        aria-labelledby="help-modal-title"
        onClose={() => setShowHelp(false)}
        className="backdrop:bg-black/50 bg-white dark:bg-surface-raised rounded-lg shadow-xl max-w-2xl w-full p-6 m-auto"
      >
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <h3
              id="help-modal-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              {helpText.title}
            </h3>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label={t('common', 'close')}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="text-gray-700 dark:text-gray-300">
            <h4 className="font-semibold mb-2">{helpText.specs}</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{helpText.dimensions}</li>
              <li>{helpText.aspectRatio}</li>
              <li>{helpText.format}</li>
              <li>{helpText.fileSize}</li>
            </ul>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              {helpText.button}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
