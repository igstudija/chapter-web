'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  HelpCircle,
  X,
  Maximize2,
  Minimize2,
  ImageIcon,
  Film,
  ChevronLeft,
  ChevronRight,
  Plus,
  EyeOff,
  PanelBottom,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  Users,
} from 'lucide-react'
import { useTranslations } from './TranslationsProvider'
import { slideImageHelp } from './slideImageHelp'
import { resizeImage, resizePresets } from '@/lib/resizeImage'
import { isSupportedSlideVideoUrl } from '@/lib/slideVideo'
import { ColorPicker } from './ColorPicker'
import { MAX_SLIDE_IMAGES, type MemberSlideTemplate, type SlideMediaType } from '@/lib/buildSlides'

/** One uploaded slide image: the media id we save, plus its URL for previews. */
export interface SlideImageRef {
  id: string
  url: string
}

interface PresentationFormProps {
  readonly initialData: {
    readonly tyfcbGiven: number | null
    readonly tyfcbReceived: number | null
    readonly slideImages: readonly SlideImageRef[]
    readonly slideMediaType: SlideMediaType
    readonly slideVideoUrl: string | null
    readonly slideTemplate: MemberSlideTemplate
    readonly slideSpecialRequestDisplay: string
    readonly slideNextSpeakerPosition: string
    readonly slideBackgroundColor?: string
    readonly slideBackgroundColorRight?: string
    readonly slideImageMode?: 'contain' | 'cover'
    readonly profileImageUrl: string | null
    readonly logoUrl: string | null
    readonly name: string
    readonly surname: string
    readonly company: string
  }
  readonly siteId?: string
  /** The chapter's values, used to show what an untouched member is getting. */
  readonly chapterRequestDisplay?: string
  readonly chapterNextPosition?: string
  readonly businessGivenMin?: number
  readonly businessReceivedMin?: number
  readonly onColorChange?: (color: string) => void
  readonly onColorRightChange?: (color: string) => void
  readonly onImageModeChange?: (mode: 'contain' | 'cover') => void
  readonly onImagesChange?: (images: readonly SlideImageRef[]) => void
  readonly onMediaTypeChange?: (mediaType: SlideMediaType) => void
  readonly onVideoUrlChange?: (url: string | null) => void
  readonly onTemplateChange?: (template: MemberSlideTemplate) => void
  readonly onSpecialRequestDisplayChange?: (value: string) => void
  readonly onNextSpeakerPositionChange?: (value: string) => void
  readonly onTyfcbChange?: (field: 'tyfcbGiven' | 'tyfcbReceived', value: number | null) => void
}

const TEMPLATES: MemberSlideTemplate[] = ['classic', 'cover', 'reels']

/**
 * Per-member overrides, each starting with the chapter default.
 *
 * That first segment is not decoration: an override is one click away, and
 * without a way back the member could never return to the chapter's choice.
 * It matters most for the chapter's `slide` option, which has no member-level
 * equivalent at all — the column's enum is inherit/bar/flash/off — so staying
 * inherited is the only way to keep a dedicated special-request slide.
 *
 * A member who has never touched these sees the chapter segment highlighted;
 * what they are actually getting is spelled out in its tooltip.
 */
const REQUEST_OPTIONS = [
  { value: 'inherit', labelKey: 'chapterDefault', Icon: Users },
  { value: 'bar', labelKey: 'requestBar', Icon: PanelBottom },
  { value: 'flash', labelKey: 'requestBalloon', Icon: MessageSquare },
  { value: 'off', labelKey: 'requestHide', Icon: EyeOff },
] as const

const NEXT_POSITION_OPTIONS = [
  { value: 'inherit', labelKey: 'chapterDefault', Icon: Users },
  { value: 'top', labelKey: 'positionTop', Icon: ArrowUp },
  { value: 'bottom', labelKey: 'positionBottom', Icon: ArrowDown },
] as const

const segmentClass = (active: boolean) =>
  `h-12 w-12 flex items-center justify-center rounded-lg border-2 transition-all ${
    active
      ? 'border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
      : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
  }`

/** Miniature of each layout, so the choice is visual rather than a word. */
function TemplateThumb({ template }: { readonly template: MemberSlideTemplate }) {
  const block = 'rounded-[2px] bg-current'

  // Full-bleed media with an information layer down the left edge.
  if (template === 'reels') {
    return (
      <div className="relative h-7 w-11 overflow-hidden rounded-[2px]">
        <div className={`${block} absolute inset-0 opacity-70`} />
        <div className={`${block} absolute inset-y-0 left-0 w-[22px] opacity-100`} />
        <div className="absolute left-[3px] top-[4px] flex flex-col gap-[2px]">
          <div className="h-[9px] w-[9px] rounded-[3px] bg-white/85" />
          <div className="mt-[1px] h-[3px] w-[16px] rounded-[1px] bg-white/85" />
          <div className="h-[2px] w-[11px] rounded-[1px] bg-white/50" />
        </div>
        <div className="absolute bottom-[4px] left-[3px] flex gap-[2px]">
          <div className="h-[2px] w-[7px] rounded-[1px] bg-white/85" />
          <div className="h-[2px] w-[7px] rounded-[1px] bg-white/35" />
        </div>
      </div>
    )
  }

  // Two columns: text left, media right.
  return (
    <div className="flex h-7 w-11 gap-[3px]">
      <div className="flex w-[18px] flex-col justify-center gap-[3px]">
        <div className={`${block} h-[8px] w-[8px] self-center rounded-full opacity-70`} />
        <div className={`${block} h-[3px] w-full opacity-35`} />
        <div className={`${block} h-[3px] w-[12px] self-center opacity-25`} />
      </div>
      <div className={`${block} flex-1 opacity-70`} />
    </div>
  )
}

export function PresentationForm({
  initialData,
  siteId,
  chapterRequestDisplay = 'bar',
  chapterNextPosition = 'top',
  businessGivenMin = 0,
  businessReceivedMin = 0,
  onColorChange,
  onColorRightChange,
  onImageModeChange,
  onImagesChange,
  onMediaTypeChange,
  onVideoUrlChange,
  onTemplateChange,
  onSpecialRequestDisplayChange,
  onNextSpeakerPositionChange,
  onTyfcbChange,
}: PresentationFormProps) {
  const router = useRouter()
  const { t } = useTranslations()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tyfcbGiven, setTyfcbGiven] = useState<number | null>(initialData.tyfcbGiven)
  const [tyfcbReceived, setTyfcbReceived] = useState<number | null>(initialData.tyfcbReceived)
  const [slideImages, setSlideImages] = useState<SlideImageRef[]>([...initialData.slideImages])
  const [mediaType, setMediaType] = useState<SlideMediaType>(initialData.slideMediaType)
  const [videoUrl, setVideoUrl] = useState(initialData.slideVideoUrl || '')
  const [template, setTemplate] = useState<MemberSlideTemplate>(initialData.slideTemplate)
  const [requestDisplay, setRequestDisplay] = useState(initialData.slideSpecialRequestDisplay)
  const [nextPosition, setNextPosition] = useState(initialData.slideNextSpeakerPosition)
  const [videoError, setVideoError] = useState(false)
  const [slideBackgroundColor, setSlideBackgroundColor] = useState(
    initialData.slideBackgroundColor || '#ffffff',
  )
  /**
   * `null` means the member never set a media-side colour, and the slide falls
   * back to the profile-side one. Seeding this with that fallback instead would
   * show the preview an override that Save can never persist — the editor would
   * promise two colours where the projector shows one.
   */
  const [slideBackgroundColorRight, setSlideBackgroundColorRight] = useState<string | null>(
    initialData.slideBackgroundColorRight ?? null,
  )
  const [slideImageMode, setSlideImageMode] = useState(initialData.slideImageMode || 'contain')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /**
   * Kept apart from `error`: patchMembership clears `error` on every save, so a
   * warning raised just before one would be wiped in the same tick.
   */
  const [notice, setNotice] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
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
  const originalColorRight = useRef<string | null>(initialData.slideBackgroundColorRight ?? null)
  const originalImageMode = useRef(initialData.slideImageMode || 'contain')
  const originalVideoUrl = useRef(initialData.slideVideoUrl || '')

  /** PATCH the current member's membership; returns whether it stuck. */
  const patchMembership = useCallback(
    async (data: Record<string, unknown>): Promise<boolean> => {
      setSaving(true)
      setError(null)
      try {
        const response = await fetch('/api/users/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ...data, siteId }),
        })
        if (!response.ok) throw new Error('Failed to save')
        router.refresh()
        return true
      } catch {
        setError(t('profile', 'saveFailed'))
        return false
      } finally {
        setSaving(false)
      }
    },
    [router, siteId, t],
  )

  /**
   * Persist the image list. `slideImage` mirrors the first entry so anything
   * still reading the legacy single-image field stays correct.
   *
   * Shows the new list immediately, but puts the old one back if the save
   * fails — otherwise a dropped request leaves the thumbnails and the live
   * preview showing an order (or an absence) the database never accepted.
   * Returns whether it stuck, so callers can hold off on anything destructive.
   */
  const saveImages = useCallback(
    async (images: SlideImageRef[]): Promise<boolean> => {
      const previous = slideImages
      setSlideImages(images)
      onImagesChange?.(images)
      const saved = await patchMembership({
        slideImages: images.map((image) => image.id),
        slideImage: images[0]?.id ?? null,
      })
      if (!saved) {
        setSlideImages(previous)
        onImagesChange?.(previous)
      }
      return saved
    },
    [slideImages, onImagesChange, patchMembership],
  )

  // Save field on blur (when user leaves the input)
  const handleFieldBlur = async (field: 'tyfcbGiven' | 'tyfcbReceived') => {
    const currentValue = field === 'tyfcbGiven' ? tyfcbGiven : tyfcbReceived
    const originalValue = field === 'tyfcbGiven' ? originalGiven.current : originalReceived.current

    // Only save if value changed
    if (currentValue === originalValue) return

    const saved = await patchMembership({ [field]: currentValue })
    if (!saved) return

    if (field === 'tyfcbGiven') {
      originalGiven.current = currentValue
    } else {
      originalReceived.current = currentValue
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return

    // Take only what still fits, and say so rather than dropping files quietly.
    const room = MAX_SLIDE_IMAGES - slideImages.length
    const files = selected.slice(0, Math.max(room, 0))

    setNotice(files.length < selected.length ? t('presentation', 'imagesLimit') : null)

    // At the cap there is nothing to upload — leave without a pointless PATCH.
    if (files.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    setError(null)

    try {
      const uploaded: SlideImageRef[] = []
      for (const file of files) {
        // Resize client-side so a phone photo doesn't travel at full size
        const resizedFile = await resizeImage(file, resizePresets.hero)

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
        uploaded.push({ id: String(uploadedMedia.doc.id), url: uploadedMedia.doc.url })
      }

      await saveImages([...slideImages, ...uploaded])
    } catch {
      setError(t('profile', 'uploadFailed'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = async (index: number) => {
    const removed = slideImages[index]
    const remaining = slideImages.filter((_, i) => i !== index)

    // Unlink first. If that failed the membership still points at this media,
    // so deleting the file would leave the slide referencing a row that is
    // gone — a broken image on the projector with nothing on screen to explain
    // it. The photo stays put and the member can try again.
    const saved = await saveImages(remaining)
    if (!saved) return

    // Drop the file too — it exists only for this slide.
    try {
      await fetch(`/api/media/${removed.id}`, { method: 'DELETE', credentials: 'include' })
    } catch {
      console.warn('Could not delete slide image media')
    }
  }

  const handleMoveImage = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= slideImages.length) return
    const reordered = [...slideImages]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    await saveImages(reordered)
  }

  const handleMediaTypeChange = async (next: SlideMediaType) => {
    if (next === mediaType) return
    setMediaType(next)
    onMediaTypeChange?.(next)
    await patchMembership({ slideMediaType: next })
  }

  // What the slide will actually do right now, whether or not it was chosen.
  const effectiveRequest = requestDisplay === 'inherit' ? chapterRequestDisplay : requestDisplay
  const effectiveNextPosition = nextPosition === 'inherit' ? chapterNextPosition : nextPosition

  /** What the media side actually renders: its own colour, or the profile side's. */
  const effectiveColorRight = slideBackgroundColorRight ?? slideBackgroundColor

  // Keep the preview honest as the profile-side colour moves under an unset
  // media side, instead of leaving it on whatever it was seeded with.
  useEffect(() => {
    onColorRightChange?.(effectiveColorRight)
  }, [effectiveColorRight, onColorRightChange])

  /** Spelled-out names, so the inherit tooltip can say what is inherited. */
  const requestLabel = (value: string) => {
    if (value === 'bar') return t('presentation', 'requestBar')
    if (value === 'flash') return t('presentation', 'requestBalloon')
    if (value === 'slide') return t('presentation', 'requestOwnSlide')
    if (value === 'off') return t('presentation', 'requestHide')
    return t('presentation', 'chapterDefault')
  }

  const positionLabel = (value: string) =>
    value === 'bottom' ? t('presentation', 'positionBottom') : t('presentation', 'positionTop')

  /** Chapter segment reads "Chapter default — Bar along the bottom". */
  const optionTitle = (value: string, label: string, effective: string, describe: (v: string) => string) =>
    value === 'inherit' ? `${t('presentation', 'chapterDefault')} — ${describe(effective)}` : label

  const handleRequestDisplayChange = async (next: string) => {
    if (next === requestDisplay) return
    setRequestDisplay(next)
    onSpecialRequestDisplayChange?.(next)
    await patchMembership({ slideSpecialRequestDisplay: next })
  }

  const handleNextPositionChange = async (next: string) => {
    if (next === nextPosition) return
    setNextPosition(next)
    onNextSpeakerPositionChange?.(next)
    await patchMembership({ slideNextSpeakerPosition: next })
  }

  const handleTemplateChange = async (next: MemberSlideTemplate) => {
    if (next === template) return
    setTemplate(next)
    onTemplateChange?.(next)
    await patchMembership({ slideTemplate: next })
  }

  const handleVideoUrlBlur = async () => {
    const trimmed = videoUrl.trim()
    if (trimmed === originalVideoUrl.current) return

    if (trimmed !== '' && !isSupportedSlideVideoUrl(trimmed)) {
      setVideoError(true)
      return
    }

    setVideoError(false)
    onVideoUrlChange?.(trimmed || null)
    const saved = await patchMembership({ slideVideoUrl: trimmed || null })
    if (saved) originalVideoUrl.current = trimmed
  }

  const formatMinAmount = (value: number) =>
    `${new Intl.NumberFormat('lv-LV', { maximumFractionDigits: 0 }).format(value)} €`
  const minHint = (min: number) =>
    t('profile', 'minBusinessHint').replace('{amount}', formatMinAmount(min))

  const templateLabel = (value: MemberSlideTemplate) => {
    if (value === 'cover') return t('presentation', 'templateCover')
    if (value === 'reels') return t('presentation', 'templateReels')
    return t('presentation', 'templateClassic')
  }


  const toggleClass = (active: boolean) =>
    `flex h-12 w-12 items-center justify-center rounded-lg border-2 transition-all ${
      active
        ? 'border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
    }`

  return (
    <div>
      {/* Error Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {/* Warnings that are not failures — kept out of `error` so a save cannot
          wipe them before they have been read. */}
      {notice && (
        <div className="mb-4 rounded-lg bg-amber-100 p-3 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          {notice}
        </div>
      )}

      {/* Media: images or video */}
      <div className="mt-8">
        {/* Layout first: the arrangement frames what the media has to fill, so
            it is chosen before the media is picked. Colour, fit and the request
            toggle ride along on the same line — they describe the arrangement,
            and the row had the space. */}
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('presentation', 'template')}
            </label>
            <div className="flex flex-wrap gap-3">
            {TEMPLATES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handleTemplateChange(value)}
                aria-pressed={template === value}
                title={templateLabel(value)}
                aria-label={templateLabel(value)}
                className={`flex h-12 w-16 items-center justify-center rounded-lg border-2 transition-all ${
                  template === value
                    ? 'border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
                }`}
              >
                <TemplateThumb template={value} />
              </button>
              ))}
            </div>
          </div>

          <div className="ml-auto flex flex-wrap gap-4 items-end justify-end">
            {/* Two background colours, on every layout. Classic puts them side
                by side; the full-bleed layouts stack them — the first carries
                the type, the second sits behind the media. Both under one
                heading: which swatch is which is in their tooltips, not in a
                pair of long labels that push the row apart. */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t('common', 'background')}
              </label>
              <div className="flex gap-2">
                <ColorPicker
                  value={slideBackgroundColor}
                  title={t('presentation', 'backgroundLeft')}
                  onChange={(color) => {
                    setSlideBackgroundColor(color)
                    onColorChange?.(color)
                  }}
                />
                <ColorPicker
                  value={effectiveColorRight}
                  title={t('presentation', 'backgroundRight')}
                  onChange={setSlideBackgroundColorRight}
                />
              </div>
            </div>

            {/* Image Mode Buttons */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t('presentation', 'imageFit')}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSlideImageMode('contain')
                    onImageModeChange?.('contain')
                  }}
                  className={`h-12 w-12 flex items-center justify-center rounded-lg border-2 transition-all ${
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
                  className={`h-12 w-12 flex items-center justify-center rounded-lg border-2 transition-all ${
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

            {/* Both of these overrule the chapter's choice for this member's
                slide only, so each group starts with "chapter default" rather
                than silently pretending the member picked what they inherited. */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t('presentation', 'specialRequest')}
              </label>
              <div className="flex gap-2">
                {REQUEST_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleRequestDisplayChange(option.value)}
                    aria-pressed={requestDisplay === option.value}
                    title={optionTitle(
                      option.value,
                      t('presentation', option.labelKey),
                      effectiveRequest,
                      requestLabel,
                    )}
                    className={segmentClass(requestDisplay === option.value)}
                  >
                    <option.Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t('presentation', 'nextSpeaker')}
              </label>
              <div className="flex gap-2">
                {NEXT_POSITION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleNextPositionChange(option.value)}
                    aria-pressed={nextPosition === option.value}
                    title={optionTitle(
                      option.value,
                      t('presentation', option.labelKey),
                      effectiveNextPosition,
                      positionLabel,
                    )}
                    className={segmentClass(nextPosition === option.value)}
                  >
                    <option.Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Save Slide Settings Button */}
            {(slideBackgroundColor !== originalColor.current ||
              slideBackgroundColorRight !== originalColorRight.current ||
              slideImageMode !== originalImageMode.current) && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={async () => {
                    const updateData: Record<string, string | null> = {}
                    if (slideBackgroundColor !== originalColor.current) {
                      updateData.slideBackgroundColor = slideBackgroundColor
                    }
                    if (slideBackgroundColorRight !== originalColorRight.current) {
                      updateData.slideBackgroundColorRight = slideBackgroundColorRight
                    }
                    if (slideImageMode !== originalImageMode.current) {
                      updateData.slideImageMode = slideImageMode
                    }
                    const saved = await patchMembership(updateData)
                    if (saved) {
                      originalColor.current = slideBackgroundColor
                      originalColorRight.current = slideBackgroundColorRight
                      originalImageMode.current = slideImageMode
                    }
                  }}
                  disabled={saving}
                  className="btn btn-primary h-12 px-5 py-0 text-sm disabled:cursor-not-allowed disabled:opacity-50"
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

          </div>
        </div>

        {/* Media: images or video */}
        <div className="mt-6 flex flex-wrap items-end gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {t('presentation', 'mediaType')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleMediaTypeChange('image')}
                title={t('presentation', 'mediaImages')}
                aria-label={t('presentation', 'mediaImages')}
                className={toggleClass(mediaType === 'image')}
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleMediaTypeChange('video')}
                title={t('presentation', 'mediaVideo')}
                aria-label={t('presentation', 'mediaVideo')}
                className={toggleClass(mediaType === 'video')}
              >
                <Film className="w-4 h-4" />
              </button>
            </div>
          </div>

          {mediaType === 'image' ? (
            <div className="flex-1 min-w-[280px]">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t('presentation', 'images')}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              {/* Thumbnails and the add tile share one row and one size — the
                  add action is the last tile rather than a button of its own. */}
              <ul className="flex flex-wrap items-center gap-3">
                {slideImages.map((image, index) => (
                  <li
                    key={image.id}
                    className="group relative h-12 w-16 overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-600"
                  >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">
                          {index + 1}
                        </span>
                        {/* Locked while a save or upload is in flight: those
                            handlers work from the list as it was when they
                            started, so a removal alongside them would be
                            written back with an id that no longer exists. */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          disabled={uploading || saving}
                          title={t('presentation', 'removeImage')}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 disabled:opacity-30"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute inset-x-0 bottom-0 flex justify-between opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={() => handleMoveImage(index, -1)}
                            disabled={uploading || saving || index === 0}
                            title={t('presentation', 'moveImageLeft')}
                            className="flex h-5 w-1/2 items-center justify-center bg-black/60 text-white disabled:opacity-30"
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveImage(index, 1)}
                            disabled={uploading || saving || index === slideImages.length - 1}
                            title={t('presentation', 'moveImageRight')}
                            className="flex h-5 w-1/2 items-center justify-center bg-black/60 text-white disabled:opacity-30"
                          >
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                  </li>
                ))}

                {slideImages.length < MAX_SLIDE_IMAGES && (
                  <li>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || saving}
                      title={t('presentation', 'addImages')}
                      aria-label={t('presentation', 'addImages')}
                      className="flex h-12 w-16 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-700 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-neutral-200"
                    >
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Plus className="h-5 w-5" />
                      )}
                    </button>
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <div className="flex-1 min-w-[280px]">
              <label
                htmlFor="slideVideoUrl"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('presentation', 'videoUrl')}
              </label>
              <input
                type="url"
                id="slideVideoUrl"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value)
                  setVideoError(false)
                  // Feed the live preview as soon as the link becomes valid.
                  if (isSupportedSlideVideoUrl(e.target.value)) {
                    onVideoUrlChange?.(e.target.value.trim())
                  } else if (e.target.value.trim() === '') {
                    onVideoUrlChange?.(null)
                  }
                }}
                onBlur={handleVideoUrlBlur}
                placeholder={t('presentation', 'videoPlaceholder')}
                className={`h-12 w-full rounded-lg border bg-white dark:bg-surface px-4 text-neutral-900 dark:text-surface-text ${
                  videoError
                    ? 'border-red-500'
                    : 'border-neutral-300 dark:border-neutral-600'
                }`}
              />
              {/* Only speak up when something is wrong — the placeholder
                  already shows what a valid link looks like. */}
              {videoError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {t('presentation', 'videoInvalid')}
                </p>
              )}
            </div>
          )}

          <div className="ml-auto flex gap-4 items-end">
            {/* TYFCB Given */}
            <div>
              <label
                htmlFor="tyfcbGiven"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('profile', 'businessGiven')}
              </label>
              <div className="relative">
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
                  className={`h-12 rounded-lg border border-neutral-300 bg-white pl-4 text-neutral-900 dark:border-neutral-600 dark:bg-surface dark:text-surface-text ${
                    businessGivenMin > 0 ? 'w-56 pr-28' : 'w-36 pr-4'
                  }`}
                />
                {/* The minimum lives inside the field: as a line underneath it
                    pushed the inputs out of line with the rest of the row. */}
                {businessGivenMin > 0 && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-neutral-100 px-2 py-1 text-[11px] text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                    {minHint(businessGivenMin)}
                  </span>
                )}
              </div>
            </div>

            {/* TYFCB Received */}
            <div>
              <label
                htmlFor="tyfcbReceived"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('profile', 'businessReceived')}
              </label>
              <div className="relative">
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
                  className={`h-12 rounded-lg border border-neutral-300 bg-white pl-4 text-neutral-900 dark:border-neutral-600 dark:bg-surface dark:text-surface-text ${
                    businessReceivedMin > 0 ? 'w-56 pr-28' : 'w-36 pr-4'
                  }`}
                />
                {/* The minimum lives inside the field: as a line underneath it
                    pushed the inputs out of line with the rest of the row. */}
                {businessReceivedMin > 0 && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-neutral-100 px-2 py-1 text-[11px] text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                    {minHint(businessReceivedMin)}
                  </span>
                )}
              </div>
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
                className="btn btn-primary h-12 px-5 py-0 text-sm disabled:cursor-not-allowed disabled:opacity-50"
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
        </div>
      </div>
    </div>
  )
}
