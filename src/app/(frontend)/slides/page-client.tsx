'use client'

import { useEffect, useState } from 'react'
import { SlideshowViewer } from '@/components/slides/SlideshowViewer'
import type { BuildSlidesContext, SlideBlockData } from '@/lib/buildSlides'

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

interface SlidesData {
  slideBlocks: SlideBlockData[]
  buildContext: Omit<BuildSlidesContext, 'attendanceFilter'>
  transitionSoundUrl: string | null
  locale: 'lv' | 'en'
  translations?: SlideshowTranslations
}

export default function SlidesPageClient({ startMemberId }: { startMemberId?: string }) {
  const [data, setData] = useState<SlidesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/slides/data')
        if (!response.ok) {
          throw new Error('Failed to fetch slides data')
        }
        const json = await response.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="bg-neutral-50 dark:bg-surface min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Loading slides...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-neutral-50 dark:bg-surface min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error || 'Failed to load slides'}</p>
      </div>
    )
  }

  return (
    <SlideshowViewer
      slideBlocks={data.slideBlocks}
      buildContext={data.buildContext}
      transitionSoundUrl={data.transitionSoundUrl}
      startMemberId={startMemberId}
      translations={data.translations}
    />
  )
}
