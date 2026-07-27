'use client'

import React from 'react'
import { parseSlideVideo } from '@/lib/slideVideo'

/**
 * How long the whole photo set takes to play through before repeating.
 * Change this one number to re-time every member slide's fade sequence.
 */
export const SLIDE_IMAGE_CYCLE_MS = 30_000

/** Upper bound on the cross-fade; short sequences get the full second-plus. */
const MAX_FADE_MS = 1200

interface SlideMediaProps {
  /** Ordered image URLs. One image renders static; several cross-fade. */
  readonly images: readonly string[]
  readonly videoUrl?: string | null
  readonly mediaType?: 'image' | 'video'
  readonly displayMode?: 'contain' | 'cover'
  readonly alt?: string
  readonly cycleMs?: number
  /** Rendered when there is no usable media — company logo, name, anything. */
  readonly fallback?: React.ReactNode
  readonly className?: string
  /**
   * Drive the sequence from outside. Needed when the indicator lives in part of
   * the layout this component doesn't own — see `useSlideImageCycle`.
   */
  readonly controlledIndex?: number
}

interface ImageCycle {
  /** De-duplicated, blank-free list the cycle actually runs over. */
  images: string[]
  activeIndex: number
  /** Milliseconds each photo holds the frame. `0` when there is nothing to cycle. */
  stepMs: number
}

/**
 * Runs a photo sequence: every photo gets an equal share of `cycleMs`, so two
 * photos change every 15s of a 30s sequence, three every 10s, and so on.
 *
 * Keyed on the URLs themselves rather than array identity. Callers build their
 * list inline, so a fresh array arrives on every render — and the viewer
 * re-renders once a second while its countdown ticks. Depending on identity
 * restarted the interval on each tick, which pinned every sequence to photo one.
 */
export function useSlideImageCycle(
  images: readonly string[],
  cycleMs: number,
  options: { paused?: boolean } = {},
): ImageCycle {
  const imageKey = images.filter(Boolean).join(' ')
  const usableImages = React.useMemo(
    () => (imageKey === '' ? [] : imageKey.split(' ')),
    [imageKey],
  )

  const [activeIndex, setActiveIndex] = React.useState(0)
  const stepMs = usableImages.length > 1 ? Math.max(cycleMs / usableImages.length, 800) : 0
  const paused = options.paused === true

  React.useEffect(() => {
    setActiveIndex(0)
    if (paused || usableImages.length <= 1) return

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % usableImages.length)
    }, stepMs)
    return () => clearInterval(interval)
  }, [usableImages, stepMs, paused])

  return { images: usableImages, activeIndex, stepMs }
}

/**
 * The media half of a member slide: a cross-fading photo sequence, an embedded
 * YouTube/Vimeo video, or the caller's fallback when neither is configured.
 *
 * Fills its parent, so the parent owns the aspect ratio and background colour.
 */
export function SlideMedia({
  images,
  videoUrl,
  mediaType = 'image',
  displayMode = 'contain',
  alt = '',
  cycleMs = SLIDE_IMAGE_CYCLE_MS,
  fallback = null,
  className = '',
  controlledIndex,
}: SlideMediaProps) {
  const video = mediaType === 'video' ? parseSlideVideo(videoUrl) : null
  // A controlled index means the parent already runs the cycle — for layouts
  // that draw the indicator somewhere this component cannot reach. A second
  // interval here would fight it.
  const cycle = useSlideImageCycle(mediaType === 'video' ? [] : images, cycleMs, {
    paused: controlledIndex !== undefined,
  })
  const usableImages = cycle.images
  const activeIndex = controlledIndex ?? cycle.activeIndex
  const stepMs = cycle.stepMs
  const fadeMs = stepMs > 0 ? Math.min(MAX_FADE_MS, stepMs * 0.4) : 0

  if (video) {
    return (
      <VideoFrame
        embedUrl={video.embedUrl}
        title={alt || 'Slide video'}
        cover={displayMode === 'cover'}
        className={className}
      />
    )
  }

  if (usableImages.length === 0) return <>{fallback}</>

  const isCover = displayMode === 'cover'
  const fit = isCover ? 'object-cover' : 'object-contain'
  // Drifting a letterboxed image would walk its edges out of frame, so motion
  // is reserved for images that already fill their box.
  const driftFor = (index: number): React.CSSProperties =>
    isCover
      ? {
          animation: `slide-drift-${index % 2 === 0 ? 'a' : 'b'} ${Math.max(
            stepMs || cycleMs,
            8000,
          )}ms ease-in-out infinite alternate`,
        }
      : {}

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {usableImages.map((url, index) => {
        const isActive = index === activeIndex
        return (
          <div
            key={`${url}-${index}`}
            data-slide-layer={index}
            className="absolute inset-0"
            style={{ opacity: isActive ? 1 : 0, transition: `opacity ${fadeMs}ms ease-in-out` }}
          >
            <img
              src={url}
              alt={isActive ? alt : ''}
              aria-hidden={isActive ? undefined : true}
              crossOrigin="anonymous"
              className={`absolute inset-0 h-full w-full ${fit}`}
              style={driftFor(index)}
            />
          </div>
        )
      })}

    </div>
  )
}

/** Aspect ratio the YouTube and Vimeo players lay their picture out in. */
const PLAYER_ASPECT = 16 / 9

/**
 * An embedded player, optionally scaled to fill its frame.
 *
 * An iframe cannot be told to crop: the player letterboxes inside whatever box
 * it is given, so a 16:9 video in a wider or taller frame comes with black
 * bars baked in. Scaling the whole iframe past the point where the picture
 * covers the frame pushes those bars outside the clip, which is the only way to
 * get a genuinely full-bleed background video out of a third-party embed.
 */
function VideoFrame({
  embedUrl,
  title,
  cover,
  className = '',
}: {
  embedUrl: string
  title: string
  cover: boolean
  className?: string
}) {
  const frameRef = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(1)

  React.useEffect(() => {
    const node = frameRef.current
    if (!node || !cover) {
      setScale(1)
      return
    }

    const measure = () => {
      const { width, height } = node.getBoundingClientRect()
      if (width === 0 || height === 0) return
      const frameAspect = width / height
      // Whichever way the frame differs from the player, this is how much
      // bigger the iframe has to be for the picture to reach both edges.
      setScale(Math.max(frameAspect / PLAYER_ASPECT, PLAYER_ASPECT / frameAspect))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [cover])

  return (
    <div ref={frameRef} className={`relative h-full w-full overflow-hidden ${className}`}>
      <iframe
        key={embedUrl}
        src={embedUrl}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="pointer-events-none absolute inset-0 h-full w-full border-0"
        style={scale === 1 ? undefined : { transform: `scale(${scale})`, transformOrigin: 'center' }}
      />
    </div>
  )
}


/**
 * The image list a member slide should render, preferring the multi-image field
 * and falling back to the legacy single `slideImage`.
 */
export function memberSlideImages(member: {
  slideImages?: Array<{ url?: string | null }> | null
  slideImage?: { url?: string | null } | null
}): string[] {
  const many = (member.slideImages || [])
    .map((entry) => entry?.url)
    .filter((url): url is string => !!url)
  if (many.length > 0) return many
  return member.slideImage?.url ? [member.slideImage.url] : []
}
