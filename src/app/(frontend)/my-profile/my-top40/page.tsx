import { MyProfilePageWrapper } from '@/components/MyProfilePageWrapper'
import {
  getMyProfileBaseData,
  getProfileTabCounts,
} from '@/lib/myProfileData'

export const metadata = {
  title: 'My Top40',
  description: 'Your Top40 prospects.',
}

export default async function MyTop40Page() {
  const baseData = await getMyProfileBaseData()
  const { user, membership, settings, t, payload, profileImage, logo, memberForHeader, previewLink } = baseData

  const [tabCounts, top40Data] = await Promise.all([
    getProfileTabCounts(payload, user.id, settings.id),
    payload.find({
      collection: 'top40',
      where: {
        and: [
          { submittedBy: { equals: user.id } },
        ],
      },
      limit: 100,
      sort: '-createdAt',
    }),
  ])

  const top40Entries = top40Data.docs.map((e) => ({
    id: e.id,
    companyName: e.companyName,
    contactPerson: e.contactPerson,
    position: e.position,
    registrationNumber: e.registrationNumber,
    notes: e.notes || '',
    businessTags: e.businessTags || '',
    createdAt: e.createdAt,
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
      activeTab="top40"
      tabCounts={tabCounts}
      enableActivities={settings.enableActivities || false}
      enableSuccessStories={settings.enableSuccessStories !== false}
      isPowerGroupLead={membership?.powerGroupLead || false}
      siteId={settings.id}
      top40Entries={top40Entries}
    />
  )
}
