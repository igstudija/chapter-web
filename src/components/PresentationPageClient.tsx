'use client'

import { useState, useEffect, useMemo } from 'react'
import { PresentationForm } from './PresentationForm'
import { SlideshowViewer } from './slides/SlideshowViewer'
import type { BuildSlidesContext, SlideBlockData, SlideMember } from '@/lib/buildSlides'

function isSafari(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  return ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium')
}

interface PresentationPageClientProps {
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
  readonly siteId: string
  readonly memberId: string
  readonly slidePreviewTitle: string
  readonly businessGivenMin?: number
  readonly businessReceivedMin?: number
}

interface SlideshowTranslations {
  businessGiven: string
  businessReceived: string
  fromActivities: string
  businessTotal: string
  groupSubtitle?: string
  lookingForPartners?: string
  /* Group-slide totals. Distinct from the member-slide pair above: those label
     one member's figures, these label a whole power group's. */
  groupBusinessReceived?: string
  groupBusinessGiven?: string
  safariNotSupported?: string
  safariMessage?: string
  safariPreviewMessage?: string
}

interface PreviewData {
  slideBlocks: SlideBlockData[]
  buildContext: Omit<BuildSlidesContext, 'attendanceFilter'>
  transitionSoundUrl: string | null
  enableActivities: boolean
  translations?: SlideshowTranslations
}

function applyMemberOverrides(
  members: SlideMember[],
  memberId: string,
  overrides: {
    slideImageUrl: string | null
    tyfcbGiven: number | null
    tyfcbReceived: number | null
  },
): SlideMember[] {
  return members.map((m) => {
    if (String(m.id) !== String(memberId)) return m
    return {
      ...m,
      slideImage: overrides.slideImageUrl ? { url: overrides.slideImageUrl } : null,
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
  businessGivenMin = 0,
  businessReceivedMin = 0,
}: PresentationPageClientProps) {
  const [slideBackgroundColor, setSlideBackgroundColor] = useState(
    initialData.slideBackgroundColor || '#ffffff',
  )
  const [slideImageMode, setSlideImageMode] = useState(initialData.slideImageMode || 'contain')
  const [slideImageUrl, setSlideImageUrl] = useState(initialData.slideImageUrl)
  const [tyfcbGiven, setTyfcbGiven] = useState<number | null>(initialData.tyfcbGiven)
  const [tyfcbReceived, setTyfcbReceived] = useState<number | null>(initialData.tyfcbReceived)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSafariBrowser, setIsSafariBrowser] = useState(false)

  useEffect(() => {
    setIsSafariBrowser(isSafari())
  }, [])

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
    const overriddenMembers = applyMemberOverrides(ctx.members, memberId, {
      slideImageUrl,
      tyfcbGiven,
      tyfcbReceived,
    })
    const overriddenMembersByGroup: Record<string, SlideMember[]> = {}
    for (const [groupId, groupMembers] of Object.entries(ctx.membersByGroup)) {
      overriddenMembersByGroup[groupId] = applyMemberOverrides(groupMembers, memberId, {
        slideImageUrl,
        tyfcbGiven,
        tyfcbReceived,
      })
    }
    return {
      ...ctx,
      members: overriddenMembers,
      membersByGroup: overriddenMembersByGroup,
    }
  }, [previewData, memberId, slideImageUrl, tyfcbGiven, tyfcbReceived])

  return (
    <>
      <PresentationForm
        initialData={initialData}
        siteId={_siteId}
        businessGivenMin={businessGivenMin}
        businessReceivedMin={businessReceivedMin}
        onColorChange={setSlideBackgroundColor}
        onImageModeChange={setSlideImageMode}
        onImageChange={setSlideImageUrl}
        onTyfcbChange={(field, value) => {
          if (field === 'tyfcbGiven') setTyfcbGiven(value)
          else setTyfcbReceived(value)
        }}
      />

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-ink dark:text-surface-text mb-4">
          {slidePreviewTitle}
        </h3>
        {isSafariBrowser ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
              {previewData?.translations?.safariNotSupported || 'Safari is not supported'}
            </p>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              {previewData?.translations?.safariPreviewMessage ||
                'Please use Chrome, Firefox, Opera or Microsoft Edge to preview the slideshow.'}
            </p>
          </div>
        ) : (
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
                overrideImageMode={slideImageMode}
                enableActivities={previewData.enableActivities || false}
                translations={previewData.translations}
              />
            )}
          </>
        )}
      </div>
    </>
  )
}
