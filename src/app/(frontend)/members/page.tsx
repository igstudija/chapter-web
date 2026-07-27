import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { MembersSearch, PageHeader } from '@/components'
import type { PowerGroup } from '@/payload-types'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { memberRating, groupRating } from '@/lib/memberRating'

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
  top20Count: number
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

  // Fetch memberships, top40, top20, and special requests in parallel
  const [membershipsData, top40Data, top20Data, specialRequestsData] = await Promise.all([
    payload.find({
      collection: 'members',
      limit: 100,
      where: {
        status: { equals: 'active' },
      },
      depth: 1, // Only need user.name/surname and powerGroup.title
    }),
    // These three are reduced to a count per member below and nothing else is
    // read from them. `depth: 0` leaves the relation as a raw id rather than
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
      collection: 'top20',
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

  const countByUser = (docs: { submittedBy?: unknown; requestedBy?: unknown }[], key: 'submittedBy' | 'requestedBy') => {
    const counts = new Map<string, number>()
    for (const entry of docs) {
      const userId = extractUserId(entry[key])
      if (userId) {
        counts.set(userId, (counts.get(userId) || 0) + 1)
      }
    }
    return counts
  }

  const top40CountByUser = countByUser(top40Data.docs, 'submittedBy')
  const top20CountByUser = countByUser(top20Data.docs, 'submittedBy')
  const specialRequestsCountByUser = countByUser(specialRequestsData.docs, 'requestedBy')

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
      top20Count: top20CountByUser.get(userIdStr) || 0,
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
        }
      }
      acc[groupId].members.push(member)
      return acc
    },
    {} as Record<
      string,
      {
        title: string
        members: MemberWithCounts[]
      }
    >,
  )

  // A group's rating is the mean of its members' completion, not the mean of
  // their row counts. Summing raw rows let one member with a full Top 40 carry
  // a group where nobody else had filed anything, and ignored Top 20 entirely.
  const sortedGroups = Object.entries(groupedMembers)
    .map(([groupId, group]) => {
      const rating = groupRating(group.members)
      const sortedMembers = [...group.members].sort((a, b) => memberRating(b) - memberRating(a))
      return { groupId, ...group, members: sortedMembers, rating }
    })
    .sort((a, b) => {
      if (a.groupId === 'ungrouped') return 1
      if (b.groupId === 'ungrouped') return -1
      return b.rating - a.rating // Higher rating first
    })

  return (
    <div className="min-h-screen bg-paper dark:bg-surface">
      <PageHeader
        title={t('members', 'title')}
        eyebrow={`${membersWithCounts.length}`}
        breadcrumbs={[
          { label: t('common', 'home'), href: '/' },
          { label: t('members', 'title') },
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <MembersSearch groups={sortedGroups} />
      </div>
    </div>
  )
}
