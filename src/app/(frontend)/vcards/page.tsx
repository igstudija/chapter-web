import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { PowerGroup, Media, User } from '@/payload-types'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { getSettings } from '@/lib/getSiteSettings'
import { getThumbnailUrl } from '@/lib/getThumbnailUrl'
import VCardsPageClient from './page-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'VCards',
  robots: { index: false, follow: false },
}

export default async function VCardsPage() {
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

  const membershipsData = await payload.find({
    collection: 'members',
    limit: 100,
    where: {
      status: { equals: 'active' },
    },
    depth: 1,
    sort: 'powerGroup',
  })

  const members = membershipsData.docs.map((membership) => {
    const memberUser =
      membership.user && typeof membership.user === 'object'
        ? (membership.user as User)
        : null
    const profileImage =
      membership.profileImage && typeof membership.profileImage === 'object'
        ? (membership.profileImage as Media)
        : null
    const powerGroup =
      membership.powerGroup && typeof membership.powerGroup === 'object'
        ? (membership.powerGroup as PowerGroup)
        : null

    return {
      id: String(membership.id),
      name: memberUser?.name || '',
      surname: memberUser?.surname || '',
      email: memberUser?.email || '',
      phone: membership.phone || '',
      company: membership.company || '',
      jobPosition: membership.jobPosition || '',
      website: membership.website || '',
      profileImageUrl: getThumbnailUrl(profileImage?.url, 'thumbnail'),
      powerGroupTitle: powerGroup?.title || '',
    }
  })

  return <VCardsPageClient members={members} />
}
