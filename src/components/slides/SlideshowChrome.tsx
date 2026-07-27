'use client'

import React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Maximize,
  Minimize,
  Video,
  Presentation,
  UsersRound,
} from 'lucide-react'
import type { NextSpeakerPosition } from '@/lib/buildSlides'

export const SLIDE_WIDTH = 1920
export const SLIDE_HEIGHT = 1080
/** The time strip. Overlaid, so it costs the slide nothing. */
export const TIME_STRIP_HEIGHT = 8
/** Height of the member slide's request bar; mirrored from MemberSlide. */
const REQUEST_BAR_HEIGHT = 60

export type AttendanceFilter = 'all' | 'onsite' | 'online'

export interface ChromeProps {
  readonly onFirst: () => void
  readonly onPrev: () => void
  readonly onNext: () => void
  readonly onToggleFullscreen: () => void
  readonly isFullscreen: boolean
  readonly attendanceEnabled: boolean
  readonly attendance: AttendanceFilter
  readonly onAttendanceChange: (value: AttendanceFilter) => void
  /** Countdown is only meaningful on slides that auto-advance. */
  readonly showTimer: boolean
  readonly slideDuration: number
  readonly progressStarted: boolean
  readonly nextName: string
  /** Which corner the next-speaker badge sits in. */
  readonly nextPosition?: NextSpeakerPosition
  /** Whether the current slide is showing the red request bar along its foot. */
  readonly requestBarVisible?: boolean
  readonly slideNumber: number
  readonly totalSlides: number
  /** Controls fade in on pointer activity. */
  readonly controlsVisible?: boolean
  readonly onPointerActivity?: () => void
}

const NEXT_GLYPH = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M7.58 16.89l5.77-4.07c.56-.4.56-1.24 0-1.63L7.58 7.11C6.91 6.65 6 7.12 6 7.93v8.14c0 .81.91 1.28 1.58.82M16 7v10c0 .55.45 1 1 1s1-.45 1-1V7c0-.55-.45-1-1-1s-1 .45-1 1"
    />
  </svg>
)

/** Round icon button used across the control cluster. */
function ControlButton({
  onClick,
  title,
  active = false,
  children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
        active ? 'bg-brand text-white' : 'bg-white/10 text-white hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  )
}

function ControlCluster({ props }: { props: ChromeProps }) {
  const {
    onFirst,
    onPrev,
    onNext,
    onToggleFullscreen,
    isFullscreen,
    attendanceEnabled,
    attendance,
    onAttendanceChange,
  } = props

  return (
    <div className="flex items-center gap-3">
      <ControlButton onClick={onFirst} title="Go to first slide">
        <Home className="h-5 w-5" />
      </ControlButton>
      <ControlButton onClick={onPrev} title="Previous slide">
        <ChevronLeft className="h-5 w-5" />
      </ControlButton>
      <ControlButton onClick={onNext} title="Next slide">
        <ChevronRight className="h-5 w-5" />
      </ControlButton>
      <ControlButton
        onClick={onToggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
      >
        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
      </ControlButton>
      {attendanceEnabled && (
        <>
          <ControlButton
            onClick={() => onAttendanceChange('onsite')}
            title="On-site only"
            active={attendance === 'onsite'}
          >
            <Presentation className="h-5 w-5" />
          </ControlButton>
          <ControlButton
            onClick={() => onAttendanceChange('online')}
            title="Online only"
            active={attendance === 'online'}
          >
            <Video className="h-5 w-5" />
          </ControlButton>
          <ControlButton
            onClick={() => onAttendanceChange('all')}
            title="Everyone"
            active={attendance === 'all'}
          >
            <UsersRound className="h-5 w-5" />
          </ControlButton>
        </>
      )}
    </div>
  )
}

/**
 * The slideshow's controls: the slide keeps all 1080px and everything else
 * floats over it.
 *
 * Time runs as a strip along the top edge, and who is up next sits top right as
 * a glass badge — the one thing the room benefits from seeing without asking.
 * Navigation and the slide number stay hidden until the presenter reaches for
 * them, by moving the pointer or resting it low, which is how every video
 * player has behaved for a decade and keeps a projected slide free of
 * furniture.
 */
export function SlideshowChrome(props: ChromeProps) {
  const {
    showTimer,
    slideDuration,
    progressStarted,
    nextName,
    nextPosition = 'top',
    requestBarVisible = false,
    slideNumber,
    totalSlides,
    controlsVisible = false,
    onPointerActivity,
  } = props

  const [stripHovered, setStripHovered] = React.useState(false)
  const revealed = controlsVisible || stripHovered

  const badge =
    'pointer-events-auto flex items-center gap-3 rounded-full bg-black/55 px-6 py-3 text-white backdrop-blur-md ring-1 ring-white/15'

  return (
    <foreignObject x="0" y="0" width={SLIDE_WIDTH} height={SLIDE_HEIGHT}>
      <div
        className="pointer-events-none relative h-full w-full"
        onMouseMove={onPointerActivity}
      >
        {/*
          Who is up next is the one thing the room benefits from seeing without
          asking, so it is the only permanent badge. The countdown is already
          the strip along the bottom edge, and the slide number is a presenter's
          concern — both ride with the controls instead of sitting on the slide.

          Top right because every member layout puts its portrait, contacts or
          request bar along the bottom and the logo owns the top left; there it
          is media or empty, and a dark glass pill stays legible over a photo.
        */}
        {nextName && (
          <div
            className="absolute right-8"
            style={
              // Same inset from the corner as the top position; it only steps up
              // when the request bar is actually occupying the foot of the slide.
              nextPosition === 'bottom'
                ? { bottom: requestBarVisible ? 32 + REQUEST_BAR_HEIGHT : 32 }
                : { top: 32 }
            }
          >
            <div className={badge} style={{ fontSize: 28 }}>
              <span className="opacity-60">{NEXT_GLYPH}</span>
              <span className="font-medium">{nextName}</span>
            </div>
          </div>
        )}


        {/*
          Time runs along the top edge, not the bottom. Overlaid it costs the
          slide no height at all, and the foot of a member slide is already
          spoken for by the request bar — a red strip on a red bar is no strip.
        */}
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: TIME_STRIP_HEIGHT, backgroundColor: 'rgba(0,0,0,0.35)' }}
        >
          {showTimer && (
            <div
              className="h-full"
              style={{
                width: progressStarted ? '100%' : '0%',
                background: 'linear-gradient(90deg, #ef4444, #b91c1c)',
                transition: progressStarted ? `width ${slideDuration}s linear` : 'none',
              }}
            />
          )}
        </div>

        {/* Controls, revealed on pointer activity or when the pointer rests low. */}
        <div
          className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col items-center justify-end"
          style={{ height: 190 }}
          onMouseEnter={() => setStripHovered(true)}
          onMouseLeave={() => setStripHovered(false)}
        >
          <div
            className="mb-8 flex items-center gap-5 rounded-full bg-black/55 px-5 py-3 backdrop-blur-md ring-1 ring-white/15"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 220ms ease, transform 220ms ease',
              pointerEvents: revealed ? 'auto' : 'none',
            }}
          >
            <ControlCluster props={props} />
            {/* Position rides along with the controls — it is what a presenter
                reaching for the buttons wants to know. The countdown is the
                strip below, and the section name is announced by its own slide. */}
            <span className="pr-3 text-white/70" style={{ fontSize: 24 }}>
              <span className="font-semibold text-white">{slideNumber}</span>
              <span className="mx-1 opacity-50">/</span>
              <span>{totalSlides}</span>
            </span>
          </div>

        </div>
      </div>
    </foreignObject>
  )
}
