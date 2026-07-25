'use client'

import { Users } from 'lucide-react'

interface Guest {
  name: string
  company?: string | null
  description?: string | null
  attendance?: 'onsite' | 'online'
}

interface GuestsSlideProps {
  guests: Guest[]
  logoUrl: string | null
  chapterName: string
  pageNumber?: number
  totalPages?: number
  startIndex?: number
  title?: string
}

// Fixed sizes - optimized for 24 guests per slide in 3 columns x 8 rows
const FONT_SIZE = '26px'
const HEADER_SIZE = '56px'
const ICON_SIZE = '56px'
const ROW_HEIGHT = '120px'
const NPK_WIDTH = '50px'

// Max guests per slide (6 rows x 3 columns with 120px row height)
export const GUESTS_PER_SLIDE = 18

export function GuestsSlide({
  guests,
  logoUrl,
  chapterName,
  pageNumber = 1,
  totalPages = 1,
  startIndex = 0,
  title = 'Viesi',
}: Readonly<GuestsSlideProps>) {
  if (guests.length === 0) return null

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-br from-gray-50 to-white rounded-lg overflow-hidden">
      {/* Header: Title - fixed at top with padding */}
      <div className="shrink-0 pt-6 pb-2">
        <h1 className="font-bold text-neutral-800 text-center" style={{ fontSize: HEADER_SIZE }}>
          {title}
          {totalPages > 1 && (
            <span className="text-neutral-400 font-normal ml-4" style={{ fontSize: '32px' }}>
              ({pageNumber}/{totalPages})
            </span>
          )}
        </h1>
      </div>

      {/* Guests - flex wrap, last row centered, pushed up */}
      <div className="flex-1 w-full px-6 pb-4 overflow-hidden flex items-center justify-center" style={{ marginTop: '-40px' }}>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 w-full">
          {guests.map((guest, index) => (
            <div
              key={`${guest.name}-${guest.company || 'no-company'}-${startIndex + index}`}
              className="flex items-center gap-3 px-4 rounded-lg bg-white shadow-sm border border-gray-100"
              style={{ height: ROW_HEIGHT, width: 'calc(33.333% - 11px)' }}
            >
              {/* Number badge */}
              <div
                className="shrink-0 rounded-lg bg-brand flex items-center justify-center text-white font-bold"
                style={{ width: NPK_WIDTH, height: '70px', fontSize: '22px' }}
              >
                {startIndex + index + 1}
              </div>

              {/* Guest info - stacked vertically */}
              <div className="flex-1 min-w-0 flex flex-col justify-center leading-tight">
                <div
                  className="font-bold text-neutral-800 truncate"
                  style={{ fontSize: FONT_SIZE }}
                >
                  {guest.name}
                </div>
                {guest.company && (
                  <div className="text-neutral-600 truncate" style={{ fontSize: '24px' }}>
                    {guest.company}
                  </div>
                )}
                {guest.description && (
                  <div className="text-neutral-500 truncate italic" style={{ fontSize: '23px' }}>
                    {guest.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
