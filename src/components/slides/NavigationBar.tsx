'use client'

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pause,
  Play,
  Maximize,
  Minimize,
} from 'lucide-react'

interface NavigationBarProps {
  readonly currentSlide: number
  readonly totalSlides: number
  readonly timeRemaining: number
  readonly isPaused: boolean
  readonly isFullscreen: boolean
  readonly groupName: string
  readonly nextMemberName: string
  readonly onPrev: () => void
  readonly onNext: () => void
  readonly onFirst: () => void
  readonly onLast: () => void
  readonly onTogglePause: () => void
  readonly onToggleFullscreen: () => void
}

export function NavigationBar({
  currentSlide,
  totalSlides,
  timeRemaining,
  isPaused,
  isFullscreen,
  groupName,
  nextMemberName,
  onPrev,
  onNext,
  onFirst,
  onLast,
  onTogglePause,
  onToggleFullscreen,
}: NavigationBarProps) {
  return (
    <div className="h-full bg-brand flex items-center justify-between px-4">
      {/* Left - Navigation Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onFirst}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="First slide (Home)"
        >
          <ChevronsLeft className="w-5 h-5" />
        </button>
        <button
          onClick={onPrev}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Previous slide (←)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={onNext}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Next slide (→)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          onClick={onLast}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Last slide (End)"
        >
          <ChevronsRight className="w-5 h-5" />
        </button>
        <button
          onClick={onToggleFullscreen}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors ml-2"
          title="Toggle fullscreen (F)"
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
        <button
          onClick={onTogglePause}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Pause/Play (Space)"
        >
          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </button>
      </div>

      {/* Center - Group Name */}
      <div className="flex-1 text-center">
        <span className="text-white font-semibold text-lg">{groupName}</span>
      </div>

      {/* Right - Next Member & Timer */}
      <div className="flex items-center gap-4">
        {/* Timer */}
        <div className="flex items-center gap-2 text-white/80">
          <span className="text-sm">⏱</span>
          <span className="font-mono text-sm">{timeRemaining}s</span>
        </div>

        {/* Next Member */}
        {nextMemberName && (
          <div className="bg-[#1a2744] text-white px-4 py-1.5 rounded flex items-center gap-2">
            <span className="text-xs text-white/60">Nākamais:</span>
            <span className="font-normal">{nextMemberName}</span>
          </div>
        )}

        {/* Slide Counter */}
        <div className="text-white/80 text-sm">
          {currentSlide} / {totalSlides}
        </div>
      </div>
    </div>
  )
}
