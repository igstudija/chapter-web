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
import {
  buildSlidesFromBlocks,
  type SlideBlockData,
  type BuildSlidesContext,
  type SlideData,
  type SlideMember,
  type SlidePowerGroup,
} from '@/lib/buildSlides'
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
}

interface SlideshowViewerProps {
  slideBlocks: SlideBlockData[]
  buildContext: Omit<BuildSlidesContext, 'attendanceFilter'>
  transitionSoundUrl?: string | null
  startMemberId?: string | null
  overrideBackgroundColor?: string
  overrideImageMode?: 'contain' | 'cover'
  enableActivities?: boolean
  translations?: SlideshowTranslations
}

const defaultTranslations: SlideshowTranslations = {
  businessGiven: 'Business Given',
  businessReceived: 'Business Received',
  fromActivities: 'From Activities',
  businessTotal: 'Total business',
  groupSubtitle: 'Our experts. For your growth.',
  lookingForPartners: 'Looking for collaboration partners',
  groupBusinessReceived: 'Business received',
  groupBusinessGiven: 'Business given',
}

export function SlideshowViewer({
  slideBlocks,
  buildContext,
  transitionSoundUrl,
  startMemberId,
  overrideBackgroundColor,
  overrideImageMode,
  enableActivities = false,
  translations = defaultTranslations,
}: Readonly<SlideshowViewerProps>) {
  const [initialSlideSet, setInitialSlideSet] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
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
      if ((slide?.type === 'member' || slide?.type === 'guest-detail') && !slide?.disableTimer) {
        setProgressStarted(true)
      }
    }, 50)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlideIndex])

  useEffect(() => {
    const slide = slides[currentSlideIndex]
    if (
      timeRemaining === 1 &&
      (slide?.type === 'member' || slide?.type === 'guest-detail') &&
      !slide?.disableTimer &&
      transitionSoundUrl
    ) {
      const audio = new Audio(transitionSoundUrl)
      audio.play().catch(() => {})
    }
  }, [timeRemaining, currentSlideIndex, slides, transitionSoundUrl])

  useEffect(() => {
    const slide = slides[currentSlideIndex]
    if (slide?.type !== 'member' && slide?.type !== 'guest-detail') return
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

  const getCurrentGroupName = () => {
    if (!currentSlide) return ''
    if (currentSlide.type === 'group') {
      return (currentSlide.data as { group: SlidePowerGroup }).group.title
    }
    if (currentSlide.type === 'member') {
      const data = currentSlide.data as { member: SlideMember; group?: SlidePowerGroup }
      return data.group?.title || ''
    }
    if (currentSlide.type === 'guests' || currentSlide.type === 'guest-detail') {
      return (currentSlide.data as { title?: string }).title || ''
    }
    return ''
  }

  const getNextMemberName = () => {
    if (currentSlideIndex === totalSlides - 1) return ''

    const nextIndex = currentSlideIndex + 1
    const nextSlideData = slides[nextIndex]
    if (!nextSlideData) return ''

    if (nextSlideData.type === 'member') {
      const data = nextSlideData.data as { member: SlideMember }
      return `${data.member.name} ${data.member.surname}`
    }
    if (nextSlideData.type === 'group') {
      const data = nextSlideData.data as { group: SlidePowerGroup }
      return data.group.title
    }
    if (nextSlideData.type === 'guest-detail') {
      const data = nextSlideData.data as { guest: { name: string } }
      return data.guest.name
    }
    if (nextSlideData.type === 'guests') {
      return (nextSlideData.data as { title?: string }).title || 'Viesi'
    }
    if (nextSlideData.type === 'speech-master-ceremony') {
      const data = nextSlideData.data as { title?: string | null }
      return data.title || 'Runas Meistars'
    }
    if (nextSlideData.type === 'intro') {
      return 'Intro'
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

  const progressPercent = progressStarted ? 100 : 0
  const slideDuration = currentSlide?.duration || buildContext.settings.slideSeconds

  const SLIDE_WIDTH = 1920
  const SLIDE_HEIGHT = 1080
  const BOTTOM_BAR_HEIGHT = 60
  const PROGRESS_BAR_HEIGHT = 4

  const logoUrl = buildContext.settings.logoUrl
  const chapterName = buildContext.settings.chapterName

  return (
    <div
      ref={containerRef}
      className={`bg-neutral-950 flex items-center justify-center ${
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
        <foreignObject
          x="0"
          y="0"
          width={SLIDE_WIDTH}
          height={SLIDE_HEIGHT - BOTTOM_BAR_HEIGHT - PROGRESS_BAR_HEIGHT}
        >
          <div className="w-full h-full relative">
            {logoUrl && currentSlide.type !== 'intro' && currentSlide.type !== 'custom-image' && (
              <div className="absolute left-6 top-6 z-10 bg-white rounded-lg p-2 shadow-md">
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={120}
                  height={44}
                  className="h-11 w-auto"
                />
              </div>
            )}

            <div className="w-full h-full p-3">
              {currentSlide.type === 'intro' && (
                <IntroSlide
                  members={(currentSlide.data as { members: SlideMember[] }).members}
                  onMemberClick={goToMember}
                />
              )}
              {currentSlide.type === 'group' && (
                <GroupSlide
                  group={(currentSlide.data as { group: SlidePowerGroup; members: SlideMember[] }).group}
                  members={(currentSlide.data as { group: SlidePowerGroup; members: SlideMember[] }).members}
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
              {currentSlide.type === 'guests' && (() => {
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
              {currentSlide.type === 'guest-detail' && (() => {
                const detailData = currentSlide.data as {
                  guest: { name: string; company?: string; description?: string; attendance?: 'onsite' | 'online' }
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
              {currentSlide.type === 'member' && (() => {
                const memberData = currentSlide.data as {
                  member: SlideMember
                  isSpeechMaster: boolean
                  group?: SlidePowerGroup
                }
                const isStartMember =
                  String(memberData.member.id) === String(startMemberId)
                return (
                  <MemberSlide
                    member={memberData.member}
                    isSpeechMaster={memberData.isSpeechMaster}
                    showAttendanceIcon={enableAttendance}
                    overrideBackgroundColor={isStartMember ? overrideBackgroundColor : undefined}
                    overrideImageMode={isStartMember ? overrideImageMode : undefined}
                    enableActivities={enableActivities}
                    translations={translations}
                    businessGivenMin={buildContext.settings.businessGivenMin ?? 0}
                    businessReceivedMin={buildContext.settings.businessReceivedMin ?? 0}
                  />
                )
              })()}
              {currentSlide.type === 'speech-master-ceremony' && (() => {
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
              {currentSlide.type === 'custom-image' && (() => {
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
          </div>
        </foreignObject>

        {(currentSlide?.type === 'member' || currentSlide?.type === 'guest-detail') && !currentSlide?.disableTimer && (
          <>
            <rect
              x="0"
              y={SLIDE_HEIGHT - BOTTOM_BAR_HEIGHT - PROGRESS_BAR_HEIGHT}
              width={SLIDE_WIDTH}
              height={PROGRESS_BAR_HEIGHT}
              fill="#334155"
            />
            <rect
              x="0"
              y={SLIDE_HEIGHT - BOTTOM_BAR_HEIGHT - PROGRESS_BAR_HEIGHT}
              width={(progressPercent / 100) * SLIDE_WIDTH}
              height={PROGRESS_BAR_HEIGHT}
              fill="url(#progressGradient)"
              style={{
                transition: progressStarted ? `width ${slideDuration}s linear` : 'none',
              }}
            />
          </>
        )}

        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
        </defs>

        <foreignObject
          x="0"
          y={SLIDE_HEIGHT - BOTTOM_BAR_HEIGHT}
          width={SLIDE_WIDTH}
          height={BOTTOM_BAR_HEIGHT}
        >
          <div className="w-full h-full bg-neutral-900/50 backdrop-blur-sm px-6 flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <button
                onClick={goToFirst}
                title="Go to home"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              >
                <Home className="h-5 w-5" />
              </button>
              <button
                onClick={prevSlide}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextSlide}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              >
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </button>

              {enableAttendance && (
                <>
                  <button
                    onClick={() => setAttendanceFilter('onsite')}
                    title="On-site"
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                      attendanceFilter === 'onsite'
                        ? 'bg-brand text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <Presentation className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setAttendanceFilter('online')}
                    title="Online"
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                      attendanceFilter === 'online'
                        ? 'bg-brand text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <Video className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setAttendanceFilter('all')}
                    title="All"
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                      attendanceFilter === 'all'
                        ? 'bg-brand text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <UsersRound className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 text-center">
              <span className="text-white font-semibold text-2xl">
                {getCurrentGroupName() || chapterName}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {(currentSlide?.type === 'member' || currentSlide?.type === 'guest-detail') && !currentSlide?.disableTimer && (
                <span className="font-mono font-bold text-3xl">{timeRemaining}s</span>
              )}
              {getNextMemberName() && (
                <div className="rounded-lg px-4 py-2">
                  <span className="ml-2 font-normal text-white text-3xl flex items-center gap-2">
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-10 w-10"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          d="M7.58 16.89l5.77-4.07c.56-.4.56-1.24 0-1.63L7.58 7.11C6.91 6.65 6 7.12 6 7.93v8.14c0 .81.91 1.28 1.58.82M16 7v10c0 .55.45 1 1 1s1-.45 1-1V7c0-.55-.45-1-1-1s-1 .45-1 1"
                        />
                      </svg>
                    </span>
                    <span>{getNextMemberName()}</span>
                  </span>
                </div>
              )}
              <div className="text-neutral-200 text-lg">
                <span className="font-semibold">{currentSlideIndex + 1}</span>
                <span className="mx-1">/</span>
                <span>{totalSlides}</span>
              </div>
            </div>
          </div>
        </foreignObject>

        {(currentSlide?.type === 'member' || currentSlide?.type === 'guest-detail') && !currentSlide?.disableTimer && (
          <circle
            cx={(progressPercent / 100) * SLIDE_WIDTH}
            cy={SLIDE_HEIGHT - BOTTOM_BAR_HEIGHT - PROGRESS_BAR_HEIGHT / 2}
            r="10"
            fill="#b91c1c"
            style={{
              transition: progressStarted ? `cx ${slideDuration}s linear` : 'none',
            }}
          />
        )}
      </svg>
    </div>
  )
}
