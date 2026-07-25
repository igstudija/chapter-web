import { redirect } from 'next/navigation'
import { MyProfilePageWrapper } from '@/components/MyProfilePageWrapper'
import { PresentationPageClient } from '@/components/PresentationPageClient'
import { getMyProfileBaseData, getProfileTabCounts, extractMediaImage } from '@/lib/myProfileData'

export const metadata = {
  title: 'Presentation Slide',
  description: 'Your presentation slide settings.',
}

export default async function PresentationPage() {
  const baseData = await getMyProfileBaseData()
  const {
    user,
    membership,
    currentSite,
    t,
    payload,
    profileImage,
    logo,
    memberForHeader,
    previewLink,
  } = baseData

  // Check if blocked
  const isActive = baseData.userWithContext.isSuperadmin || membership?.status === 'active'
  if (!isActive) {
    redirect('/my-profile')
  }

  const tabCounts = await getProfileTabCounts(payload, String(user.id), String(currentSite.id))

  const slideImage = extractMediaImage(membership?.slideImage)

  // Minimum thresholds from slideshow settings — shown as "min:" hints under the inputs
  const slideshowSettingsResult = await payload.find({
    collection: 'slideshow-settings-collection',
    where: { site: { equals: currentSite.id } },
    limit: 1,
    depth: 0,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slideshowSettings = (slideshowSettingsResult.docs[0] as any) || null
  const businessGivenMin = slideshowSettings?.businessGivenMin || 0
  const businessReceivedMin = slideshowSettings?.businessReceivedMin || 0

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
      activeTab="presentation"
      tabCounts={tabCounts}
      enableActivities={currentSite.enableActivities || false}
      enableSuccessStories={currentSite.enableSuccessStories !== false}
      isPowerGroupLead={membership?.powerGroupLead || false}
      siteId={String(currentSite.id)}
    >
      <PresentationPageClient
        initialData={{
          tyfcbGiven: membership?.tyfcbGiven ?? null,
          tyfcbReceived: membership?.tyfcbReceived ?? null,
          slideImageUrl: slideImage?.url || null,
          slideImageId:
            membership?.slideImage && typeof membership.slideImage === 'object'
              ? String(membership.slideImage.id)
              : null,
          slideBackgroundColor: membership?.slideBackgroundColor || undefined,
          slideImageMode: membership?.slideImageMode || undefined,
          profileImageUrl: profileImage?.url || null,
          logoUrl: logo?.url || null,
          name: user.name,
          surname: user.surname,
          company: membership?.company || '',
        }}
        siteId={String(currentSite.id)}
        memberId={String(user.id)}
        slidePreviewTitle={t('profile', 'slidePreview')}
        businessGivenMin={businessGivenMin}
        businessReceivedMin={businessReceivedMin}
      />
    </MyProfilePageWrapper>
  )
}
