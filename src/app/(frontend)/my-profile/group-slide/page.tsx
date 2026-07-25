import { redirect } from 'next/navigation'
import { MyProfilePageWrapper } from '@/components/MyProfilePageWrapper'
import { GroupSlideEditor } from '@/components/GroupSlideEditor'
import { getMyProfileBaseData, getProfileTabCounts } from '@/lib/myProfileData'

export const metadata = {
  title: 'Group Slide',
  description: 'Edit your power group slide description.',
}

export default async function GroupSlidePage() {
  const baseData = await getMyProfileBaseData()
  const {
    user,
    membership,
    settings,
    t,
    payload,
    profileImage,
    logo,
    memberForHeader,
    previewLink,
  } = baseData

  // Only power group leads can access this page
  if (!membership?.powerGroupLead || !membership?.powerGroup) {
    redirect('/my-profile')
  }

  const tabCounts = await getProfileTabCounts(payload, String(user.id), String(settings.id))

  // Get the power group data
  const powerGroupId =
    typeof membership.powerGroup === 'object' ? membership.powerGroup.id : membership.powerGroup

  const powerGroup = await payload.findByID({
    collection: 'power-groups',
    id: powerGroupId,
    depth: 0,
  })

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
      activeTab="group-slide"
      tabCounts={tabCounts}
      enableActivities={settings.enableActivities || false}
      enableSuccessStories={settings.enableSuccessStories !== false}
      isPowerGroupLead={true}
      siteId={String(settings.id)}
    >
      <GroupSlideEditor
        powerGroupId={String(powerGroup.id)}
        powerGroupTitle={powerGroup.title}
        initialDescription={powerGroup.description || ''}
      />
    </MyProfilePageWrapper>
  )
}
