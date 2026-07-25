import { redirect } from 'next/navigation'
import { isUserAdmin } from '@/lib/userHelpers'
import { MyProfilePageWrapper } from '@/components/MyProfilePageWrapper'
import { ActivitiesContent } from '@/components/ActivitiesContent'
import {
  getMyProfileBaseData,
  getProfileTabCounts,
  getSiteMembers,
} from '@/lib/myProfileData'

export const metadata = {
  title: 'My Activities',
  description: 'Your activities and stats.',
}

export default async function ActivitiesPage() {
  const baseData = await getMyProfileBaseData()
  const { user, membership, settings, t, payload, profileImage, logo, memberForHeader, previewLink } = baseData

  // Check if activities feature is enabled
  if (!settings.enableActivities) {
    redirect('/my-profile')
  }

  // Check if blocked
  const isActive = isUserAdmin(baseData.userWithContext) || membership?.status === 'active'
  if (!isActive) {
    redirect('/my-profile')
  }

  // Fetch all data in parallel
  const [tabCounts, meetingsData, referralsGivenData, referralsReceivedData, members] = await Promise.all([
    getProfileTabCounts(payload, user.id, settings.id),
    payload.find({
      collection: 'one-to-one-meetings',
      where: {
        and: [
          {
            or: [
              { createdBy: { equals: user.id } },
              { metWith: { equals: user.id } },
            ],
          },
        ],
      },
      limit: 100,
      sort: '-date',
      depth: 1, // Reduced from 2
    }),
    payload.find({
      collection: 'referrals',
      where: {
        and: [
          { fromUser: { equals: user.id } },
        ],
      },
      limit: 100,
      sort: '-date',
      depth: 1,
    }),
    payload.find({
      collection: 'referrals',
      where: {
        and: [
          { toUser: { equals: user.id } },
        ],
      },
      limit: 100,
      sort: '-date',
      depth: 1,
    }),
    getSiteMembers(payload, String(settings.id), String(user.id)),
  ])

  // Transform meetings data
  const meetings = meetingsData.docs.map((m: any) => ({
    id: m.id,
    metWith: m.metWith && typeof m.metWith === 'object' ? {
      id: m.metWith.id,
      name: m.metWith.name,
      surname: m.metWith.surname,
    } : null,
    invitedBy: m.invitedBy && typeof m.invitedBy === 'object' ? {
      id: m.invitedBy.id,
      name: m.invitedBy.name,
      surname: m.invitedBy.surname,
    } : null,
    location: m.location,
    topics: m.topics,
    date: m.date,
    comments: m.comments?.map((c: any) => ({
      text: c.text,
      author: c.author && typeof c.author === 'object' ? {
        id: c.author.id,
        name: c.author.name,
        surname: c.author.surname,
      } : null,
      commentCreatedAt: c.commentCreatedAt,
    })) || [],
    createdBy: m.createdBy && typeof m.createdBy === 'object' ? {
      id: m.createdBy.id,
    } : { id: m.createdBy },
  }))

  // Transform referrals data
  const transformReferral = (r: any) => ({
    id: r.id,
    fromUser: r.fromUser && typeof r.fromUser === 'object' ? {
      id: r.fromUser.id,
      name: r.fromUser.name,
      surname: r.fromUser.surname,
    } : null,
    toUser: r.toUser && typeof r.toUser === 'object' ? {
      id: r.toUser.id,
      name: r.toUser.name,
      surname: r.toUser.surname,
    } : null,
    date: r.date,
    description: r.description,
    status: r.status || 'pending',
    value: r.value,
    createdBy: r.createdBy && typeof r.createdBy === 'object' ? {
      id: r.createdBy.id,
    } : { id: r.createdBy },
  })

  const referralsGiven = referralsGivenData.docs.map(transformReferral)
  const referralsReceived = referralsReceivedData.docs.map(transformReferral)

  return (
    <MyProfilePageWrapper
      breadcrumbItems={[
        { label: t('common', 'home'), href: '/' },
        { label: t('profile', 'title') },
      ]}
      member={memberForHeader}
      profileImage={profileImage}
      logo={logo}
      previewLink={previewLink}
      activeTab="activities"
      tabCounts={tabCounts}
      enableActivities={true}
      enableSuccessStories={settings.enableSuccessStories !== false}
      isPowerGroupLead={membership?.powerGroupLead || false}
      siteId={settings.id}
    >
      <ActivitiesContent
        userId={String(user.id)}
        meetings={meetings}
        referralsGiven={referralsGiven}
        referralsReceived={referralsReceived}
        members={members}
      />
    </MyProfilePageWrapper>
  )
}
