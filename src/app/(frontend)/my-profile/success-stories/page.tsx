import { redirect } from 'next/navigation'
import { MyProfilePageWrapper } from '@/components/MyProfilePageWrapper'
import {
  getMyProfileBaseData,
  getProfileTabCounts,
  getSiteMembers,
  generateMemberSlug,
} from '@/lib/myProfileData'

export const metadata = {
  title: 'My Success Stories',
  description: 'Your success stories.',
}

export default async function MySuccessStoriesPage() {
  const baseData = await getMyProfileBaseData()
  const { user, membership, currentSite, t, payload, profileImage, logo, memberForHeader, previewLink } =
    baseData

  // Check if success stories feature is enabled
  if (currentSite.enableSuccessStories === false) {
    redirect('/my-profile')
  }

  const [tabCounts, successStoriesData, members] = await Promise.all([
    getProfileTabCounts(payload, user.id, currentSite.id),
    payload.find({
      collection: 'success-stories',
      where: {
        and: [{ author: { equals: user.id } }, { site: { equals: currentSite.id } }],
      },
      limit: 100,
      sort: '-createdAt',
      depth: 1,
    }),
    getSiteMembers(payload, String(currentSite.id), String(user.id)),
  ])

  const successStories = successStoriesData.docs.map((s) => ({
    id: s.id,
    title: s.title,
    story: s.story,
    businessValue: s.businessValue,
    partnerMember:
      s.partnerMember && typeof s.partnerMember === 'object'
        ? {
            id: s.partnerMember.id,
            name: s.partnerMember.name,
            surname: s.partnerMember.surname,
            slug: generateMemberSlug(s.partnerMember.name, s.partnerMember.surname),
          }
        : null,
    createdAt: s.createdAt,
  }))

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
      activeTab="success-stories"
      tabCounts={tabCounts}
      enableActivities={currentSite.enableActivities || false}
      enableSuccessStories={currentSite.enableSuccessStories === true}
      isPowerGroupLead={membership?.powerGroupLead || false}
      siteId={currentSite.id}
      successStories={successStories}
      members={members}
    />
  )
}
