'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import { IntroSlide } from './IntroSlide'
import { GroupSlide } from './GroupSlide'
import { MemberSlide } from './MemberSlide'
import { GuestsSlide } from './GuestsSlide'
import { GuestDetailSlide } from './GuestDetailSlide'
import { SpeechMasterCeremonySlide } from './SpeechMasterCeremonySlide'
import { CustomImageSlide } from './CustomImageSlide'
import { SpecialRequestFlash, SpecialRequestSlide } from './SpecialRequestSlide'
import { memberSlideImages } from './SlideMedia'
import { parseSlideVideo } from '@/lib/slideVideo'
import { getThumbnailUrl } from '@/lib/getThumbnailUrl'
import {
  buildSlidesFromBlocks,
  type MemberSlideTemplate,
  type SlideBlockData,
  type BuildSlidesContext,
  type SlideData,
  type SlideMember,
  type SlidePowerGroup,
} from '@/lib/buildSlides'
import { SlideshowChrome, SLIDE_WIDTH, SLIDE_HEIGHT, type ChromeProps } from './SlideshowChrome'

/** How long the minimal chrome's controls linger after the pointer stops. */
const CONTROLS_IDLE_MS = 2600
/** Tail of a member's slide during which their request is flashed. */
const SPECIAL_REQUEST_FLASH_SECONDS = 5

/**
 * What the slide after this one will need on screen.
 *
 * Fetching it while the current slide is still up is the difference between a
 * cut and a wait: a member's photo or an embedded player that starts loading
 * only when its slide appears leaves the room looking at an empty frame.
 */
function slideMediaToPreload(slide: SlideData | undefined): {
  images: string[]
  video: string | null
} {
  if (!slide) return { images: [], video: null }

  if (slide.type === 'member') {
    const { member } = slide.data as { member: SlideMember }
    const video =
      member.slideMediaType === 'video'
        ? (parseSlideVideo(member.slideVideoUrl)?.embedUrl ?? null)
        : null
    const portrait = member.profileImage?.url
    return {
      images: [
        ...(video ? [] : memberSlideImages(member)),
        ...(portrait ? [getThumbnailUrl(portrait, 'medium') || portrait] : []),
      ],
      video,
    }
  }

  if (slide.type === 'group') {
    // A group slide puts every member of the group up at once. `next/image` is
    // configured `unoptimized`, so these are the plain storage URLs and a
    // preload hits the same cache entry the slide will read.
    const { members } = slide.data as { members: SlideMember[] }
    return {
      images: members
        .flatMap((m) => [m.profileImage?.url, m.logo?.url])
        .filter((url): url is string => !!url),
      video: null,
    }
  }

  if (slide.type === 'intro') {
    // The logo wall puts eighty small images up at once — the slide where a
    // cold cache is most obvious. These are plain URLs, so a preload lands on
    // exactly the entry the wall will read.
    const { members } = slide.data as { members: SlideMember[] }
    return {
      images: members.map((m) => m.logo?.url).filter((url): url is string => !!url),
      video: null,
    }
  }

  if (slide.type === 'custom-image') {
    const { imageUrl } = slide.data as { imageUrl: string }
    return { images: imageUrl ? [imageUrl] : [], video: null }
  }

  if (slide.type === 'special-request') {
    const { member } = slide.data as { member: SlideMember }
    const portrait = member.profileImage?.url
    return {
      images: portrait ? [getThumbnailUrl(portrait, 'thumbnail') || portrait] : [],
      video: null,
    }
  }

  return { images: [], video: null }
}

/** Slide kinds that run a countdown and auto-advance. */
function isTimedSlide(slide: SlideData | undefined): boolean {
  return (
    slide?.type === 'member' || slide?.type === 'guest-detail' || slide?.type === 'special-request'
  )
}

interface SlideshowTranslations {
  businessGiven: string
  businessReceived: string
  businessTotal: string
  groupSubtitle?: string
  lookingForPartners?: string
  /** Heading over the last-seconds request flash. */
  specialRequest?: string
  /* Group-slide totals. Distinct from the member-slide pair above: those label
     one member's figures, these label a whole power group's. */
  groupBusinessReceived?: string
  groupBusinessGiven?: string
}

interface SlideshowViewerProps {
  slideBlocks: SlideBlockData[]
  buildContext: Omit<BuildSlidesContext, 'attendanceFilter'>
  transitionSoundUrl?: string | null
  startMemberId?: string | null
  overrideBackgroundColor?: string
  overrideBackgroundColorRight?: string
  overrideImageMode?: 'contain' | 'cover'
  overrideTemplate?: MemberSlideTemplate
  translations?: SlideshowTranslations
  /**
   * Bump to send the viewer back to `startMemberId`. Lets the presentation
   * editor offer "open my slide" after the presenter has browsed elsewhere,
   * without the page reload that used to be the only way back.
   */
  focusStartMemberSignal?: number
}

const defaultTranslations: SlideshowTranslations = {
  businessGiven: 'Business Given',
  businessReceived: 'Business Received',
  businessTotal: 'Total business',
  groupSubtitle: 'Our experts. For your growth.',
  lookingForPartners: 'Looking for collaboration partners',
  specialRequest: 'Special request',
  groupBusinessReceived: 'Business received',
  groupBusinessGiven: 'Business given',
}

export function SlideshowViewer({
  slideBlocks,
  buildContext,
  transitionSoundUrl,
  startMemberId,
  overrideBackgroundColor,
  overrideBackgroundColorRight,
  overrideImageMode,
  overrideTemplate,
  translations = defaultTranslations,
  focusStartMemberSignal = 0,
}: Readonly<SlideshowViewerProps>) {
  const [initialSlideSet, setInitialSlideSet] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(buildContext.settings.slideSeconds)
  const [progressStarted, setProgressStarted] = useState(false)
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'onsite' | 'online'>('all')
  const containerRef = useRef<HTMLDivElement>(null)
  const prevAttendanceFilterRef = useRef<'all' | 'onsite' | 'online'>('all')

  const slides = useMemo(
    () => buildSlidesFromBlocks(slideBlocks, { ...buildContext, attendanceFilter }),
    [slideBlocks, buildContext, attendanceFilter],
  )

  const userSlideIndex = useMemo(() => {
    if (!startMemberId) return 0

    const index = slides.findIndex((slide) => {
      if (slide.type === 'member') {
        const data = slide.data as { member: { id: string } }
        return String(data.member.id) === String(startMemberId)
      }
      return false
    })

    return index !== -1 ? index : 0
  }, [slides, startMemberId])

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  const totalSlides = slides.length
  const currentSlide = slides[currentSlideIndex]

  useEffect(() => {
    if (userSlideIndex > 0 && !initialSlideSet) {
      setCurrentSlideIndex(userSlideIndex)
      setInitialSlideSet(true)
    }
  }, [userSlideIndex, initialSlideSet])

  // "Open my slide": every bump of the signal jumps back to the member's own
  // slide, wherever the presenter has navigated to since.
  useEffect(() => {
    if (focusStartMemberSignal <= 0) return
    setCurrentSlideIndex(userSlideIndex)
    setTimeRemaining(slides[userSlideIndex]?.duration || buildContext.settings.slideSeconds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusStartMemberSignal])

  useEffect(() => {
    if (prevAttendanceFilterRef.current !== attendanceFilter) {
      setCurrentSlideIndex(0)
      prevAttendanceFilterRef.current = attendanceFilter
    }
  }, [attendanceFilter])

  const goToSlide = useCallback(
    (index: number) => {
      const newIndex = Math.max(0, Math.min(index, totalSlides - 1))
      setCurrentSlideIndex(newIndex)
      setTimeRemaining(slides[newIndex]?.duration || buildContext.settings.slideSeconds)
    },
    [totalSlides, slides, buildContext.settings.slideSeconds],
  )

  const nextSlide = useCallback(() => {
    if (totalSlides === 0) return
    goToSlide((currentSlideIndex + 1) % totalSlides)
  }, [currentSlideIndex, totalSlides, goToSlide])

  const prevSlide = useCallback(() => {
    if (totalSlides === 0) return
    goToSlide(currentSlideIndex === 0 ? totalSlides - 1 : currentSlideIndex - 1)
  }, [currentSlideIndex, totalSlides, goToSlide])

  /** Reveal the minimal chrome's controls, then fade them out once idle. */
  const notePointerActivity = useCallback(() => {
    setControlsVisible(true)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => setControlsVisible(false), CONTROLS_IDLE_MS)
  }, [])

  useEffect(
    () => () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    },
    [],
  )

  // Warm the next slide while this one is on screen.
  const preload = useMemo(
    () => slideMediaToPreload(slides[(currentSlideIndex + 1) % (slides.length || 1)]),
    [slides, currentSlideIndex],
  )
  const preloadImageKey = preload.images.join('|')

  useEffect(() => {
    if (preloadImageKey === '') return
    // Detached image elements rather than hidden nodes: no layout, no chance of
    // the browser deprioritising a zero-sized element, and they land in the same
    // HTTP cache the real <img> reads from a moment later.
    //
    // `document.createElement` rather than `new Image()`: `Image` is next/image
    // in this module, and the constructor call silently resolves to that.
    //
    // No cleanup. Clearing `src` on unmount aborted whatever was still in
    // flight — and the moment this effect re-runs is the moment the presenter
    // advanced, so the fetch being cancelled was the one for the slide now on
    // screen. The elements are unreferenced afterwards and collected anyway.
    for (const url of preloadImageKey.split('|')) {
      document.createElement('img').src = url
    }
  }, [preloadImageKey])

  const goToFirst = useCallback(() => goToSlide(0), [goToSlide])
  const goToLast = useCallback(() => goToSlide(totalSlides - 1), [goToSlide, totalSlides])

  const goToMember = useCallback(
    (memberId: string) => {
      const slideIndex = slides.findIndex((slide) => {
        if (slide.type === 'member') {
          const data = slide.data as { member: { id: string } }
          return data.member.id === memberId
        }
        return false
      })
      if (slideIndex !== -1) {
        goToSlide(slideIndex)
      }
    },
    [slides, goToSlide],
  )

  useEffect(() => {
    const duration = slides[currentSlideIndex]?.duration || buildContext.settings.slideSeconds
    setTimeRemaining(duration)
    setProgressStarted(false)
    const timeout = setTimeout(() => {
      const slide = slides[currentSlideIndex]
      if (isTimedSlide(slide) && !slide?.disableTimer) {
        setProgressStarted(true)
      }
    }, 50)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlideIndex])

  useEffect(() => {
    const slide = slides[currentSlideIndex]
    if (timeRemaining === 1 && isTimedSlide(slide) && !slide?.disableTimer && transitionSoundUrl) {
      const audio = new Audio(transitionSoundUrl)
      audio.play().catch(() => {})
    }
  }, [timeRemaining, currentSlideIndex, slides, transitionSoundUrl])

  useEffect(() => {
    const slide = slides[currentSlideIndex]
    if (!isTimedSlide(slide)) return
    if (slide?.disableTimer) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) return 0
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [currentSlideIndex, slides])

  const enterFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    if (container.requestFullscreen) {
      container.requestFullscreen()
    } else if (
      (container as HTMLDivElement & { webkitRequestFullscreen?: () => void })
        .webkitRequestFullscreen
    ) {
      ;(
        container as HTMLDivElement & { webkitRequestFullscreen: () => void }
      ).webkitRequestFullscreen()
    }
    setIsFullscreen(true)
  }, [])

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if (
      (document as Document & { webkitExitFullscreen?: () => void }).webkitExitFullscreen
    ) {
      ;(document as Document & { webkitExitFullscreen: () => void }).webkitExitFullscreen()
    }
    setIsFullscreen(false)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen()
    } else {
      enterFullscreen()
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      /*
       * These are presenter shortcuts, and they are bound to the window — but
       * the viewer also runs as a live preview on the presentation editor,
       * inches below the fields where a member types a video link or a hex
       * colour. Without this, every "c" they type flips the chrome and writes
       * the flipped value to localStorage, and every space jumps a slide.
       */
      const target = e.target as HTMLElement | null
      if (
        target?.isContentEditable ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT'
      ) {
        return
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          nextSlide()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          prevSlide()
          break
        case ' ':
          e.preventDefault()
          nextSlide()
          break
        case 'Home':
          goToFirst()
          break
        case 'End':
          goToLast()
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen()
          }
          break
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [nextSlide, prevSlide, goToFirst, goToLast, isFullscreen, toggleFullscreen, exitFullscreen])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  const enableAttendance = buildContext.enableAttendance

  const slideHeadline = (slide: SlideData): string => {
    if (slide.type === 'member') {
      const data = slide.data as { member: SlideMember }
      return `${data.member.name} ${data.member.surname}`
    }
    if (slide.type === 'group') {
      const data = slide.data as { group: SlidePowerGroup }
      return data.group.title
    }
    if (slide.type === 'guest-detail') {
      const data = slide.data as { guest: { name: string } }
      return data.guest.name
    }
    if (slide.type === 'guests') {
      return (slide.data as { title?: string }).title || 'Viesi'
    }
    if (slide.type === 'speech-master-ceremony') {
      const data = slide.data as { title?: string | null }
      return data.title || 'Runas Meistars'
    }
    if (slide.type === 'intro') {
      return 'Intro'
    }
    return ''
  }

  /**
   * Who the room should be looking forward to.
   *
   * A special-request slide belongs to the member who just presented, so it is
   * looked through rather than announced: when the chapter routes requests to
   * their own slide, every member slide is followed by one, and stopping at it
   * left the "up next" badge blank for the whole meeting.
   */
  const getNextMemberName = () => {
    for (let index = currentSlideIndex + 1; index < totalSlides; index++) {
      const next = slides[index]
      if (!next || next.type === 'special-request') continue
      return slideHeadline(next)
    }
    return ''
  }

  if (totalSlides === 0 || !currentSlide) {
    return (
      <div className="bg-[#2a2a2a] rounded-lg p-8 text-center text-neutral-400">
        Nav pieejamu slaidu
      </div>
    )
  }

  const slideDuration = currentSlide?.duration || buildContext.settings.slideSeconds
  const showTimer = isTimedSlide(currentSlide) && !currentSlide?.disableTimer

  // Both of these were resolved against the chapter default at build time, so
  // the member's own choice is already baked into the slide.
  const memberSlideData =
    currentSlide?.type === 'member'
      ? (currentSlide.data as {
          member: SlideMember
          specialRequestDisplay?: string
          nextSpeakerPosition?: 'top' | 'bottom'
          hideSpecialRequest?: boolean
        })
      : null

  // Appears with five seconds to go and stays put until the presenter moves on.
  // Slides do not auto-advance, so the countdown parks at zero — gating on
  // `timeRemaining > 0` made the request vanish at the exact moment the member
  // was wrapping up and the room was finally looking at it.
  //
  // On a slide with the timer switched off there is no "last five seconds" to
  // wait for, so it stays up the whole time. Requiring a countdown here meant a
  // power group with `disable timer` showed the request nowhere at all: the bar
  // is already suppressed for anything but `bar`, and the flash never fired.
  const flashRequest =
    memberSlideData?.specialRequestDisplay === 'flash' &&
    (!showTimer || timeRemaining <= SPECIAL_REQUEST_FLASH_SECONDS)
      ? memberSlideData.member.specialRequest
      : null

  const logoUrl = buildContext.settings.logoUrl

  const chromeProps: ChromeProps = {
    onFirst: goToFirst,
    onPrev: prevSlide,
    onNext: nextSlide,
    onToggleFullscreen: toggleFullscreen,
    isFullscreen,
    attendanceEnabled: enableAttendance,
    attendance: attendanceFilter,
    onAttendanceChange: setAttendanceFilter,
    showTimer,
    slideDuration,
    progressStarted,
    nextName: getNextMemberName(),
    // The logo wall is the one slide that fills the frame corner to corner, so
    // the top right the badge normally owns is somebody's logo. Its last row is
    // the short one, which puts the free space at the bottom — it parks there
    // regardless of what the chapter or the member chose for member slides.
    nextPosition:
      currentSlide.type === 'intro'
        ? 'bottom'
        : (memberSlideData?.nextSpeakerPosition ??
          buildContext.settings.nextSpeakerPosition ??
          'top'),
    requestBarVisible: Boolean(
      memberSlideData &&
      !memberSlideData.hideSpecialRequest &&
      memberSlideData.member.specialRequest,
    ),
    slideNumber: currentSlideIndex + 1,
    totalSlides,
    controlsVisible,
    onPointerActivity: notePointerActivity,
  }

  // The chrome is overlaid end to end, so the slide keeps all 1080px.
  const contentHeight = SLIDE_HEIGHT

  return (
    <div
      ref={containerRef}
      onMouseMove={notePointerActivity}
      className={`relative bg-neutral-950 flex items-center justify-center ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen'
          : 'w-full rounded-xl shadow-2xl aspect-video'
      }`}
    >
      <svg
        viewBox={`0 0 ${SLIDE_WIDTH} ${SLIDE_HEIGHT}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <foreignObject x="0" y="0" width={SLIDE_WIDTH} height={contentHeight}>
          <div className="w-full h-full relative">
            {logoUrl && currentSlide.type !== 'intro' && currentSlide.type !== 'custom-image' && (
              <div className="absolute left-6 top-6 z-10 bg-white rounded-lg p-2 shadow-md">
                <Image
                  src={logoUrl}
                  alt="Logo"
                  /* `h-11` is what sizes this; the attributes are only the
                     srcset hint. They have to stay off the rendered 44px,
                     or the height matches its attribute while `w-auto`
                     moves the width, and Next warns about the odd pair. */
                  width={240}
                  height={88}
                  className="h-11 w-auto"
                />
              </div>
            )}

            <div className="w-full h-full">
              {currentSlide.type === 'intro' && (
                <IntroSlide
                  members={(currentSlide.data as { members: SlideMember[] }).members}
                  onMemberClick={goToMember}
                />
              )}
              {currentSlide.type === 'group' && (
                <GroupSlide
                  group={
                    (currentSlide.data as { group: SlidePowerGroup; members: SlideMember[] }).group
                  }
                  members={
                    (currentSlide.data as { group: SlidePowerGroup; members: SlideMember[] })
                      .members
                  }
                  translations={{
                    groupSubtitle: translations.groupSubtitle ?? defaultTranslations.groupSubtitle!,
                    lookingForPartners:
                      translations.lookingForPartners ?? defaultTranslations.lookingForPartners!,
                    businessReceived:
                      translations.groupBusinessReceived ??
                      defaultTranslations.groupBusinessReceived!,
                    businessGiven:
                      translations.groupBusinessGiven ?? defaultTranslations.groupBusinessGiven!,
                  }}
                />
              )}
              {currentSlide.type === 'guests' &&
                (() => {
                  const guestsData = currentSlide.data as {
                    guests: Array<{
                      name: string
                      company?: string
                      description?: string
                      attendance?: 'onsite' | 'online'
                    }>
                    logoUrl: string | null
                    chapterName: string
                    pageNumber?: number
                    totalPages?: number
                    startIndex?: number
                    title?: string
                  }
                  return (
                    <GuestsSlide
                      guests={guestsData.guests}
                      logoUrl={guestsData.logoUrl}
                      chapterName={guestsData.chapterName}
                      pageNumber={guestsData.pageNumber}
                      totalPages={guestsData.totalPages}
                      startIndex={guestsData.startIndex}
                      title={guestsData.title}
                    />
                  )
                })()}
              {currentSlide.type === 'guest-detail' &&
                (() => {
                  const detailData = currentSlide.data as {
                    guest: {
                      name: string
                      company?: string
                      description?: string
                      attendance?: 'onsite' | 'online'
                    }
                    guestNumber: number
                    totalGuests: number
                    title?: string
                  }
                  return (
                    <GuestDetailSlide
                      guest={detailData.guest}
                      guestNumber={detailData.guestNumber}
                      totalGuests={detailData.totalGuests}
                      title={detailData.title}
                    />
                  )
                })()}
              {currentSlide.type === 'member' &&
                (() => {
                  const memberData = currentSlide.data as {
                    member: SlideMember
                    isSpeechMaster: boolean
                    group?: SlidePowerGroup
                    hideMemberInfo?: boolean
                    hideSpecialRequest?: boolean
                  }
                  const isStartMember = String(memberData.member.id) === String(startMemberId)
                  return (
                    <MemberSlide
                      member={memberData.member}
                      isSpeechMaster={memberData.isSpeechMaster}
                      hideMemberInfo={memberData.hideMemberInfo}
                      hideSpecialRequest={memberData.hideSpecialRequest}
                      imageSeconds={buildContext.settings.slideImageSeconds ?? 30}
                      showAttendanceIcon={enableAttendance}
                      overrideBackgroundColor={isStartMember ? overrideBackgroundColor : undefined}
                      overrideBackgroundColorRight={
                        isStartMember ? overrideBackgroundColorRight : undefined
                      }
                      overrideImageMode={isStartMember ? overrideImageMode : undefined}
                      overrideTemplate={isStartMember ? overrideTemplate : undefined}
                      translations={translations}
                      businessGivenMin={buildContext.settings.businessGivenMin ?? 0}
                      businessReceivedMin={buildContext.settings.businessReceivedMin ?? 0}
                    />
                  )
                })()}
              {currentSlide.type === 'speech-master-ceremony' &&
                (() => {
                  const ceremonyData = currentSlide.data as {
                    speechMaster: SlideMember
                    title?: string | null
                  }
                  return (
                    <SpeechMasterCeremonySlide
                      speechMaster={ceremonyData.speechMaster}
                      title={ceremonyData.title}
                    />
                  )
                })()}
              {currentSlide.type === 'special-request' && (
                <SpecialRequestSlide
                  member={(currentSlide.data as { member: SlideMember }).member}
                  title={translations.lookingForPartners}
                />
              )}
              {currentSlide.type === 'custom-image' &&
                (() => {
                  const imageData = currentSlide.data as {
                    imageUrl: string
                    displayMode: 'contain' | 'cover'
                    backgroundColor: string
                  }
                  return (
                    <CustomImageSlide
                      imageUrl={imageData.imageUrl}
                      displayMode={imageData.displayMode}
                      backgroundColor={imageData.backgroundColor}
                    />
                  )
                })()}
            </div>

            {flashRequest && (
              <SpecialRequestFlash request={flashRequest} title={translations.specialRequest} />
            )}
          </div>
        </foreignObject>

        <SlideshowChrome {...chromeProps} />
      </svg>

      {/*
        The next slide's player, mounted a slide early so YouTube or Vimeo has
        already fetched its script, poster and first segments. One pixel and
        invisible: enough for the embed to initialise, not enough to be seen.
      */}
      {preload.video && (
        <iframe
          key={preload.video}
          src={preload.video}
          title=""
          aria-hidden
          tabIndex={-1}
          allow="autoplay; encrypted-media"
          className="pointer-events-none absolute h-px w-px border-0 opacity-0"
        />
      )}
    </div>
  )
}
