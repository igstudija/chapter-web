import { User, Users, Trophy, Star, Microscope } from 'lucide-react'
import { TabNav } from './TabNav'

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

/**
 * Tabs on another member's profile.
 *
 * This was ~90 lines of the same markup written twice per tab — once for the
 * active state as a `<div>`, once for the inactive state as a `<Link>` — with
 * the labels shouted through `.toUpperCase()`. It is a list of five items now,
 * rendered by the same `TabNav` the reader's own profile uses, so the two
 * cannot drift apart again.
 */
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
  return (
    <TabNav
      ariaLabel={labels.about}
      items={[
        {
          href: `/members/${slug}`,
          active: activeTab === 'about',
          icon: <User className="h-4 w-4" />,
          label: labels.about,
        },
        {
          href: `/members/${slug}/special-requests`,
          active: activeTab === 'special-requests',
          icon: <Users className="h-4 w-4" />,
          label: labels.specialRequests,
          count: specialRequestsCount,
        },
        {
          href: `/members/${slug}/top-40`,
          active: activeTab === 'top-40',
          icon: <Trophy className="h-4 w-4" />,
          label: labels.top40,
          count: top40Count,
        },
        {
          href: `/members/${slug}/top-20`,
          active: activeTab === 'top-20',
          icon: <Microscope className="h-4 w-4" />,
          label: labels.top20,
          count: top20Count,
        },
        ...(enableSuccessStories
          ? [
              {
                href: `/members/${slug}/success-stories`,
                active: activeTab === 'success-stories',
                icon: <Star className="h-4 w-4" />,
                label: labels.successStories,
                count: successStoriesCount,
              },
            ]
          : []),
      ]}
    />
  )
}
