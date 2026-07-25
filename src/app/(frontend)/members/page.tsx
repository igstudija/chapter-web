import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { MembersSearch } from '@/components'
import type { PowerGroup } from '@/payload-types'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Members',
  robots: { index: false, follow: false },
}

function extractUserId(relationshipField: any): string | undefined {
  if (typeof relationshipField === 'number') {
    return String(relationshipField)
  }
  if (typeof relationshipField === 'object' && relationshipField?.id) {
    return String(relationshipField.id)
  }
  return undefined
}

function getMediaImage(media: any) {
  if (media && typeof media === 'object' && media.url) {
    return { url: media.url, alt: media.alt }
  }
  return null
}

type MemberWithCounts = {
  id: string
  name: string
  surname: string
  company: string
  jobPosition?: string | null
  orgRole?: string | null
  phone?: string | null
  email?: string | null
  profileImage?: { url: string; alt?: string | null } | null
  logo?: { url: string; alt?: string | null } | null
  powerGroup?: PowerGroup | number | string | null
  top40Count: number
  specialRequestsCount: number
}

export default async function MembersPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    redirect('/login')
  }

  const settings = await getSettings()
  if (!settings) {
    redirect('/login')
  }

  const locale = (settings?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  // Fetch memberships, top40, and special requests in parallel
  const [membershipsData, top40Data, specialRequestsData] = await Promise.all([
    payload.find({
      collection: 'members',
      limit: 100,
      where: {
        status: { equals: 'active' },
      },
      depth: 1, // Only need user.name/surname and powerGroup.title
    }),
    // Both are reduced to a count per member below and nothing else is read
    // from them. `depth: 0` leaves the relation as a raw id rather than
    // fetching each related user, and `select` narrows the row to the single
    // column that gets looked at — the difference between transferring
    // thousands of full records and thousands of integers.
    payload.find({
      collection: 'top40',
      where: {},
      limit: 5000,
      depth: 0,
      select: { submittedBy: true },
    }),
    payload.find({
      collection: 'special-requests',
      where: {},
      limit: 5000,
      depth: 0,
      select: { requestedBy: true },
    }),
  ])

  // Count top40 and special requests per user
  const top40CountByUser = new Map<string, number>()
  for (const entry of top40Data.docs) {
    const userId = extractUserId(entry.submittedBy)
    if (userId) {
      top40CountByUser.set(userId, (top40CountByUser.get(userId) || 0) + 1)
    }
  }

  const specialRequestsCountByUser = new Map<string, number>()
  for (const entry of specialRequestsData.docs) {
    const userId = extractUserId(entry.requestedBy)
    if (userId) {
      specialRequestsCountByUser.set(userId, (specialRequestsCountByUser.get(userId) || 0) + 1)
    }
  }

  // Transform memberships to members with counts
  const membersWithCounts: MemberWithCounts[] = membershipsData.docs.map((membership) => {
    const memberUser =
      membership.user && typeof membership.user === 'object' ? membership.user : null
    const userId = memberUser?.id || (typeof membership.user === 'string' ? membership.user : '')
    const userIdStr = String(userId)
    const profileImage = getMediaImage(membership.profileImage)
    const logo = getMediaImage(membership.logo)

    return {
      id: userIdStr,
      name: memberUser?.name || '',
      surname: memberUser?.surname || '',
      company: membership.company || '',
      jobPosition: membership.jobPosition || null,
      orgRole: membership.orgRole || null,
      phone: membership.phone || null,
      email: memberUser?.email || null,
      profileImage,
      logo,
      powerGroup: membership.powerGroup,
      top40Count: top40CountByUser.get(userIdStr) || 0,
      specialRequestsCount: specialRequestsCountByUser.get(userIdStr) || 0,
    }
  })

  // Group members by powerGroup and calculate rating
  const groupedMembers = membersWithCounts.reduce(
    (acc, member) => {
      const powerGroup = member.powerGroup
      const groupId = powerGroup && typeof powerGroup === 'object' ? powerGroup.id : 'ungrouped'
      const groupTitle =
        powerGroup && typeof powerGroup === 'object'
          ? powerGroup.title
          : t('members', 'otherMembers')

      if (!acc[groupId]) {
        acc[groupId] = {
          title: groupTitle,
          members: [],
          totalTop40: 0,
          totalSpecialRequests: 0,
        }
      }
      acc[groupId].members.push(member)
      acc[groupId].totalTop40 += member.top40Count
      acc[groupId].totalSpecialRequests += member.specialRequestsCount
      return acc
    },
    {} as Record<
      string,
      {
        title: string
        members: MemberWithCounts[]
        totalTop40: number
        totalSpecialRequests: number
      }
    >,
  )

  // Calculate rating for each group, sort members within groups, and sort groups by rating
  const sortedGroups = Object.entries(groupedMembers)
    .map(([groupId, group]) => {
      const rating =
        group.members.length > 0
          ? (group.totalTop40 + group.totalSpecialRequests) / group.members.length
          : 0
      // Sort members within group by their individual rating (top40 + specialRequests)
      const sortedMembers = [...group.members].sort(
        (a, b) => b.top40Count + b.specialRequestsCount - (a.top40Count + a.specialRequestsCount),
      )
      return { groupId, ...group, members: sortedMembers, rating }
    })
    .sort((a, b) => {
      if (a.groupId === 'ungrouped') return 1
      if (b.groupId === 'ungrouped') return -1
      return b.rating - a.rating // Higher rating first
    })

  return (
    <div className="bg-neutral-50 dark:bg-surface min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-sm mb-6">
          <Link href="/" className="text-neutral-500 dark:text-neutral-400 hover:text-brand">
            {t('common', 'home')}
          </Link>
          <span className="mx-2 text-neutral-400 dark:text-neutral-500">›</span>
          <span className="text-ink dark:text-surface-text">{t('members', 'title')}</span>
        </nav>

        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-ink dark:text-surface-text">
            {t('members', 'title').toUpperCase()}
          </h1>
          <span className="bg-brand text-white text-lg font-bold px-3 py-1 rounded">
            {membersWithCounts.length}
          </span>
        </div>

        <MembersSearch groups={sortedGroups} />
      </div>
    </div>
  )
}
