'use client'

import { useEffect, useState } from 'react'
import { SlideshowViewer } from '@/components/slides/SlideshowViewer'
import type { BuildSlidesContext, SlideBlockData } from '@/lib/buildSlides'

function isSafari(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  return ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium')
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
}

interface SlidesData {
  slideBlocks: SlideBlockData[]
  buildContext: Omit<BuildSlidesContext, 'attendanceFilter'>
  transitionSoundUrl: string | null
  locale: 'lv' | 'en'
  enableActivities: boolean
  translations?: SlideshowTranslations
}

export default function SlidesPageClient({ startMemberId }: { startMemberId?: string }) {
  const [data, setData] = useState<SlidesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSafariBrowser, setIsSafariBrowser] = useState(false)

  useEffect(() => {
    setIsSafariBrowser(isSafari())
  }, [])

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

  if (isSafariBrowser && data) {
    return (
      <div className="bg-neutral-900 min-h-screen flex items-center justify-center p-8">
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl p-8 max-w-lg text-center">
          <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-yellow-600 dark:text-yellow-400"
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
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
            {data.translations?.safariNotSupported || 'Safari is not supported'}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300 mb-6">
            {data.translations?.safariMessage || 'To view the slideshow, please use a different browser.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-700 rounded-full">Chrome</span>
            <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-700 rounded-full">Firefox</span>
            <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-700 rounded-full">Opera</span>
            <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-700 rounded-full">Microsoft Edge</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SlideshowViewer
      slideBlocks={data.slideBlocks}
      buildContext={data.buildContext}
      transitionSoundUrl={data.transitionSoundUrl}
      startMemberId={startMemberId}
      enableActivities={data.enableActivities}
      translations={data.translations}
    />
  )
}
