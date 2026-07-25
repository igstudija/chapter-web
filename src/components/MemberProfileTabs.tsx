import Link from 'next/link'
import { User, Users, Trophy, Star, Microscope } from 'lucide-react'

interface MemberProfileTabsProps {
  slug: string
  activeTab: 'about' | 'special-requests' | 'top-40' | 'top-20' | 'success-stories'
  specialRequestsCount: number
  top40Count: number
  top20Count: number
  successStoriesCount: number
  enableSuccessStories?: boolean
  labels: {
    about: string
    specialRequests: string
    top40: string
    top20: string
    successStories: string
  }
}

export function MemberProfileTabs({
  slug,
  activeTab,
  specialRequestsCount,
  top40Count,
  top20Count,
  successStoriesCount,
  enableSuccessStories = true,
  labels,
}: MemberProfileTabsProps) {
  const baseClasses =
    'flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors'
  const activeClasses = 'bg-brand text-white'
  const inactiveClasses =
    'bg-white dark:bg-surface-raised text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-600'
  const badgeClasses =
    'text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {activeTab === 'about' ? (
        <div className={`${baseClasses} ${activeClasses}`}>
          <User className="h-4 w-4" />
          {labels.about.toUpperCase()}
        </div>
      ) : (
        <Link href={`/members/${slug}`} className={`${baseClasses} ${inactiveClasses}`}>
          <User className="h-4 w-4" />
          {labels.about.toUpperCase()}
        </Link>
      )}

      {activeTab === 'special-requests' ? (
        <div className={`${baseClasses} ${activeClasses}`}>
          <Users className="h-4 w-4" />
          {labels.specialRequests.toUpperCase()}
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
            {specialRequestsCount}
          </span>
        </div>
      ) : (
        <Link
          href={`/members/${slug}/special-requests`}
          className={`${baseClasses} ${inactiveClasses}`}
        >
          <Users className="h-4 w-4" />
          {labels.specialRequests.toUpperCase()}
          <span className={badgeClasses}>{specialRequestsCount}</span>
        </Link>
      )}

      {activeTab === 'top-40' ? (
        <div className={`${baseClasses} ${activeClasses}`}>
          <Trophy className="h-4 w-4" />
          {labels.top40.toUpperCase()}
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
            {top40Count}
          </span>
        </div>
      ) : (
        <Link href={`/members/${slug}/top-40`} className={`${baseClasses} ${inactiveClasses}`}>
          <Trophy className="h-4 w-4" />
          {labels.top40.toUpperCase()}
          <span className={badgeClasses}>{top40Count}</span>
        </Link>
      )}

      {activeTab === 'top-20' ? (
        <div className={`${baseClasses} ${activeClasses}`}>
          <Microscope className="h-4 w-4" />
          {labels.top20.toUpperCase()}
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
            {top20Count}
          </span>
        </div>
      ) : (
        <Link href={`/members/${slug}/top-20`} className={`${baseClasses} ${inactiveClasses}`}>
          <Microscope className="h-4 w-4" />
          {labels.top20.toUpperCase()}
          <span className={badgeClasses}>{top20Count}</span>
        </Link>
      )}

      {enableSuccessStories && (
        activeTab === 'success-stories' ? (
          <div className={`${baseClasses} ${activeClasses}`}>
            <Star className="h-4 w-4" />
            {labels.successStories.toUpperCase()}
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
              {successStoriesCount}
            </span>
          </div>
        ) : (
          <Link
            href={`/members/${slug}/success-stories`}
            className={`${baseClasses} ${inactiveClasses}`}
          >
            <Star className="h-4 w-4" />
            {labels.successStories.toUpperCase()}
            <span className={badgeClasses}>{successStoriesCount}</span>
          </Link>
        )
      )}
    </div>
  )
}
