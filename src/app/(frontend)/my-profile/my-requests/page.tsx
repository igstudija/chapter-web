import { MyProfilePageWrapper } from '@/components/MyProfilePageWrapper'
import {
  getMyProfileBaseData,
  getProfileTabCounts,
} from '@/lib/myProfileData'

export const metadata = {
  title: 'My Special Requests',
  description: 'Your special requests.',
}

export default async function MyRequestsPage() {
  const baseData = await getMyProfileBaseData()
  const { user, membership, currentSite, t, payload, profileImage, logo, memberForHeader, previewLink } = baseData

  const [tabCounts, specialRequestsData] = await Promise.all([
    getProfileTabCounts(payload, user.id, currentSite.id),
    payload.find({
      collection: 'special-requests',
      where: {
        and: [
          { requestedBy: { equals: user.id } },
          { site: { equals: currentSite.id } },
        ],
      },
      limit: 100,
      sort: ['sortOrder', '-createdAt'],
    }),
  ])

  const specialRequests = specialRequestsData.docs.map((r) => ({
    id: r.id,
    request: r.request,
    registrationNumber: r.registrationNumber,
    createdAt: r.createdAt,
    sortOrder: r.sortOrder ?? 0,
    showOnSlide: r.showOnSlide ?? false,
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
      activeTab="special-requests"
      tabCounts={tabCounts}
      enableActivities={currentSite.enableActivities || false}
      enableSuccessStories={currentSite.enableSuccessStories !== false}
      isPowerGroupLead={membership?.powerGroupLead || false}
      siteId={currentSite.id}
      specialRequests={specialRequests}
    />
  )
}
