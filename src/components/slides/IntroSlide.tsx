'use client'

import { getThumbnailUrl } from '@/lib/getThumbnailUrl'

interface Member {
  id: string
  name: string
  surname: string
  company: string
  logo?: { url?: string | null } | null
}

interface IntroSlideProps {
  readonly members: readonly Member[]
  readonly onMemberClick?: (memberId: string) => void
}

export function IntroSlide({ members, onMemberClick }: IntroSlideProps) {
  // All members (with and without logos)
  const allMembers = members
  const totalCount = allMembers.length

  // Calculate optimal grid: find columns that fit all items in available rows
  // For 16:9 aspect ratio, we want more columns than rows
  // Calculate columns to ensure all logos fit
  const cols = Math.ceil(Math.sqrt(totalCount * (16 / 9)))
  const rows = Math.ceil(totalCount / cols)

  // If no members, show message
  if (totalCount === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center rounded-lg">
        <div className="text-white text-2xl">Nav biedru, kas atbilst filtram</div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex items-center justify-center rounded-lg">
      <div
        className="grid gap-2 w-full h-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {allMembers.map((member) => (
          <button
            key={member.id}
            onClick={() => onMemberClick?.(member.id)}
            className="bg-white rounded-lg p-1.5 flex items-center justify-center shadow-md hover:scale-105 transition-transform min-w-0 min-h-0 cursor-pointer"
          >
            {member.logo?.url ? (
              <img
                key={`intro-logo-${member.id}`}
                src={member.logo.url}
                alt={member.company || `${member.name} ${member.surname}`}
                className="object-contain w-full h-full"
                crossOrigin="anonymous"
              />
            ) : (
              <span className="text-[#1a2744] font-bold text-[0.6rem] text-center leading-tight truncate px-1">
                {(member.company || `${member.name} ${member.surname}`).substring(0, 15)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
