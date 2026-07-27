import { redirect } from 'next/navigation'
import { isUserAdmin } from '@/lib/userHelpers'
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
    settings,
    t,
    payload,
    profileImage,
    logo,
    memberForHeader,
    previewLink,
  } = baseData

  // Check if blocked
  const isActive = isUserAdmin(baseData.userWithContext) || membership?.status === 'active'
  if (!isActive) {
    redirect('/my-profile')
  }

  const tabCounts = await getProfileTabCounts(payload, String(user.id), String(settings.id))

  // Editor works on the multi-image list; members who only ever set the legacy
  // single image start from that one so nothing disappears on first open.
  const slideImages = (Array.isArray(membership?.slideImages) ? membership.slideImages : []).flatMap(
    (media) =>
      typeof media === 'object' && media?.url ? [{ id: String(media.id), url: media.url }] : [],
  )
  const initialSlideImages =
    slideImages.length > 0
      ? slideImages
      : membership?.slideImage && typeof membership.slideImage === 'object' && membership.slideImage.url
        ? [{ id: String(membership.slideImage.id), url: membership.slideImage.url }]
        : []

  // Minimum thresholds from slideshow settings — shown as "min:" hints under the inputs
  const slideshowSettingsResult = await payload.find({
    collection: 'slideshow-settings-collection',
    where: {},
    limit: 1,
    depth: 0,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slideshowSettings = (slideshowSettingsResult.docs[0] as any) || null
  // Shown as the active state for members who have not overridden them.
  const chapterRequestDisplay = slideshowSettings?.specialRequestDisplay || 'bar'
  const chapterNextPosition = slideshowSettings?.nextSpeakerPosition || 'top'
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
      enableActivities={settings.enableActivities || false}
      enableSuccessStories={settings.enableSuccessStories !== false}
      isPowerGroupLead={membership?.powerGroupLead || false}
      siteId={String(settings.id)}
    >
      <PresentationPageClient
        initialData={{
          tyfcbGiven: membership?.tyfcbGiven ?? null,
          tyfcbReceived: membership?.tyfcbReceived ?? null,
          slideImages: initialSlideImages,
          slideMediaType: membership?.slideMediaType === 'video' ? 'video' : 'image',
          slideVideoUrl: membership?.slideVideoUrl || null,
          slideTemplate: membership?.slideTemplate || 'classic',
          slideSpecialRequestDisplay: membership?.slideSpecialRequestDisplay || 'inherit',
          slideNextSpeakerPosition: membership?.slideNextSpeakerPosition || 'inherit',
          slideBackgroundColor: membership?.slideBackgroundColor || undefined,
          slideBackgroundColorRight: membership?.slideBackgroundColorRight || undefined,
          slideImageMode: membership?.slideImageMode || undefined,
          profileImageUrl: profileImage?.url || null,
          logoUrl: logo?.url || null,
          name: user.name,
          surname: user.surname,
          company: membership?.company || '',
        }}
        siteId={String(settings.id)}
        memberId={String(user.id)}
        slidePreviewTitle={t('profile', 'slidePreview')}
        openMySlideLabel={t('presentation', 'openMySlide')}
        chapterRequestDisplay={chapterRequestDisplay}
        chapterNextPosition={chapterNextPosition}
        businessGivenMin={businessGivenMin}
        businessReceivedMin={businessReceivedMin}
      />
    </MyProfilePageWrapper>
  )
}
