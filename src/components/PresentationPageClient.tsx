'use client'

import { useState, useEffect, useMemo } from 'react'
import { Crosshair } from 'lucide-react'
import { PresentationForm } from './PresentationForm'
import { SlideshowViewer } from './slides/SlideshowViewer'
import type {
  BuildSlidesContext,
  MemberSlideTemplate,
  SlideBlockData,
  SlideMediaType,
  SlideMember,
} from '@/lib/buildSlides'
import type { SlideImageRef } from './PresentationForm'

interface PresentationPageClientProps {
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
  readonly siteId: string
  readonly memberId: string
  readonly slidePreviewTitle: string
  readonly openMySlideLabel: string
  readonly chapterRequestDisplay?: string
  readonly chapterNextPosition?: string
  readonly businessGivenMin?: number
  readonly businessReceivedMin?: number
}

interface SlideshowTranslations {
  businessGiven: string
  businessReceived: string
  businessTotal: string
  groupSubtitle?: string
  lookingForPartners?: string
  /* Group-slide totals. Distinct from the member-slide pair above: those label
     one member's figures, these label a whole power group's. */
  groupBusinessReceived?: string
  groupBusinessGiven?: string
}

interface PreviewData {
  slideBlocks: SlideBlockData[]
  buildContext: Omit<BuildSlidesContext, 'attendanceFilter'>
  transitionSoundUrl: string | null
  translations?: SlideshowTranslations
}

interface MemberOverrides {
  slideImages: readonly SlideImageRef[]
  slideMediaType: SlideMediaType
  slideVideoUrl: string | null
  slideSpecialRequestDisplay: string
  slideNextSpeakerPosition: string
  tyfcbGiven: number | null
  tyfcbReceived: number | null
}

function applyMemberOverrides(
  members: SlideMember[],
  memberId: string,
  overrides: MemberOverrides,
): SlideMember[] {
  const images = overrides.slideImages.map((image) => ({ url: image.url }))
  return members.map((m) => {
    if (String(m.id) !== String(memberId)) return m
    return {
      ...m,
      // Legacy single-image field mirrors the first entry, same as on save.
      slideImage: images[0] ?? null,
      slideImages: images,
      slideMediaType: overrides.slideMediaType,
      slideVideoUrl: overrides.slideVideoUrl,
      slideSpecialRequestDisplay:
        overrides.slideSpecialRequestDisplay as SlideMember['slideSpecialRequestDisplay'],
      slideNextSpeakerPosition:
        overrides.slideNextSpeakerPosition as SlideMember['slideNextSpeakerPosition'],
      tyfcbGiven: overrides.tyfcbGiven,
      tyfcbReceived: overrides.tyfcbReceived,
    }
  })
}

export function PresentationPageClient({
  initialData,
  siteId: _siteId,
  memberId,
  slidePreviewTitle,
  openMySlideLabel,
  chapterRequestDisplay,
  chapterNextPosition,
  businessGivenMin = 0,
  businessReceivedMin = 0,
}: PresentationPageClientProps) {
  const [slideBackgroundColor, setSlideBackgroundColor] = useState(
    initialData.slideBackgroundColor || '#ffffff',
  )
  const [slideBackgroundColorRight, setSlideBackgroundColorRight] = useState(
    initialData.slideBackgroundColorRight || initialData.slideBackgroundColor || '#ffffff',
  )
  const [slideImageMode, setSlideImageMode] = useState(initialData.slideImageMode || 'contain')
  const [slideImages, setSlideImages] = useState<readonly SlideImageRef[]>(initialData.slideImages)
  const [slideMediaType, setSlideMediaType] = useState<SlideMediaType>(initialData.slideMediaType)
  const [slideVideoUrl, setSlideVideoUrl] = useState<string | null>(initialData.slideVideoUrl)
  const [slideTemplate, setSlideTemplate] = useState<MemberSlideTemplate>(initialData.slideTemplate)
  const [requestDisplay, setRequestDisplay] = useState(initialData.slideSpecialRequestDisplay)
  const [nextPosition, setNextPosition] = useState(initialData.slideNextSpeakerPosition)
  const [tyfcbGiven, setTyfcbGiven] = useState<number | null>(initialData.tyfcbGiven)
  const [tyfcbReceived, setTyfcbReceived] = useState<number | null>(initialData.tyfcbReceived)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped by "open my slide"; the viewer jumps back to this member on change.
  const [focusSignal, setFocusSignal] = useState(0)

  useEffect(() => {
    const timestamp = Date.now()
    fetch(`/api/slides/preview/${memberId}?t=${timestamp}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch slide data')
        return res.json()
      })
      .then((data) => {
        setPreviewData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [memberId])

  const overriddenContext = useMemo(() => {
    if (!previewData) return null
    const ctx = previewData.buildContext
    const overrides: MemberOverrides = {
      slideImages,
      slideMediaType,
      slideVideoUrl,
      slideSpecialRequestDisplay: requestDisplay,
      slideNextSpeakerPosition: nextPosition,
      tyfcbGiven,
      tyfcbReceived,
    }
    const overriddenMembers = applyMemberOverrides(ctx.members, memberId, overrides)
    const overriddenMembersByGroup: Record<string, SlideMember[]> = {}
    for (const [groupId, groupMembers] of Object.entries(ctx.membersByGroup)) {
      overriddenMembersByGroup[groupId] = applyMemberOverrides(groupMembers, memberId, overrides)
    }
    return {
      ...ctx,
      members: overriddenMembers,
      membersByGroup: overriddenMembersByGroup,
    }
  }, [
    previewData,
    memberId,
    slideImages,
    slideMediaType,
    slideVideoUrl,
    requestDisplay,
    nextPosition,
    tyfcbGiven,
    tyfcbReceived,
  ])

  return (
    <>
      <PresentationForm
        initialData={initialData}
        siteId={_siteId}
        chapterRequestDisplay={chapterRequestDisplay}
        chapterNextPosition={chapterNextPosition}
        businessGivenMin={businessGivenMin}
        businessReceivedMin={businessReceivedMin}
        onColorChange={setSlideBackgroundColor}
        onColorRightChange={setSlideBackgroundColorRight}
        onImageModeChange={setSlideImageMode}
        onImagesChange={setSlideImages}
        onMediaTypeChange={setSlideMediaType}
        onVideoUrlChange={setSlideVideoUrl}
        onTemplateChange={setSlideTemplate}
        onSpecialRequestDisplayChange={setRequestDisplay}
        onNextSpeakerPositionChange={setNextPosition}
        onTyfcbChange={(field, value) => {
          if (field === 'tyfcbGiven') setTyfcbGiven(value)
          else setTyfcbReceived(value)
        }}
      />

      <div className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink dark:text-surface-text">
            {slidePreviewTitle}
          </h3>
          {/* The preview is a full slideshow — once you browse away from your
              own slide, this is how you get back without reloading the page. */}
          <button
            type="button"
            onClick={() => setFocusSignal((n) => n + 1)}
            className="flex h-10 items-center gap-2 rounded-lg border border-neutral-300 px-4 text-sm text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <Crosshair className="h-4 w-4" />
            <span>{openMySlideLabel}</span>
          </button>
        </div>
        <>
          {loading && (
            <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
              Ielādē preview...
            </div>
          )}
          {error && <div className="p-8 text-center text-red-500">Kļūda: {error}</div>}
          {previewData && overriddenContext && (
            <SlideshowViewer
              slideBlocks={previewData.slideBlocks}
              buildContext={overriddenContext}
              transitionSoundUrl={previewData.transitionSoundUrl}
              startMemberId={memberId}
              overrideBackgroundColor={slideBackgroundColor}
              overrideBackgroundColorRight={slideBackgroundColorRight}
              overrideImageMode={slideImageMode}
              overrideTemplate={slideTemplate}
              focusStartMemberSignal={focusSignal}
              translations={previewData.translations}
            />
          )}
        </>
      </div>
    </>
  )
}
