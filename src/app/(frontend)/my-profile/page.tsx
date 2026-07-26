import { MyProfilePageWrapper } from '@/components/MyProfilePageWrapper'
import { isUserAdmin } from '@/lib/userHelpers'
import { getMyProfileBaseData, getProfileTabCounts } from '@/lib/myProfileData'

export const metadata = {
  title: 'My Profile',
  description: 'Member profile and dashboard.',
}

export default async function MyProfilePage() {
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

  // Check if blocked (special case for about page - show message)
  const isActive = isUserAdmin(baseData.userWithContext) || membership?.status === 'active'
  if (!isActive) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="display-2 mb-4 text-ink dark:text-surface-text">
            {t('profile', 'accountBlocked')}
          </h1>
          <p className="text-neutral-600">{t('profile', 'accountBlockedDescription')}</p>
        </div>
      </div>
    )
  }

  const tabCounts = await getProfileTabCounts(payload, user.id, settings.id)

  // Fetch power groups for the current site
  const powerGroupsData = await payload.find({
    collection: 'power-groups',
    where: {},
    limit: 100,
    sort: 'title',
  })
  const powerGroups = powerGroupsData.docs.map((pg) => ({ id: pg.id, title: pg.title }))

  // Get fresh user data for pending email
  const freshUser = await payload.findByID({
    collection: 'users',
    id: user.id,
  })
  const hasPendingEmailChange =
    freshUser.pendingEmail &&
    freshUser.emailChangeExpiry &&
    new Date(freshUser.emailChangeExpiry) > new Date()

  // Prepare userData for AboutMe form
  const userData = {
    name: user.name || '',
    surname: user.surname || '',
    phone: membership?.phone || '',
    description: membership?.description || null,
    company: membership?.company || '',
    jobPosition: membership?.jobPosition || '',
    orgRole: membership?.orgRole || '',
    companyPhone: membership?.companyPhone || '',
    companyEmail: membership?.companyEmail || '',
    website: membership?.website || '',
    companyDescription: membership?.companyDescription || '',
    country: membership?.country || '',
    powerGroup:
      typeof membership?.powerGroup === 'string' || typeof membership?.powerGroup === 'number'
        ? String(membership.powerGroup)
        : membership?.powerGroup?.id ? String(membership?.powerGroup?.id) : null,
    gallery: membership?.gallery || [],
    profileImageUrl: profileImage?.url || undefined,
    logoUrl: logo?.url || undefined,
    tyfcbGiven: membership?.tyfcbGiven ?? null,
    tyfcbReceived: membership?.tyfcbReceived ?? null,
  }

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
      activeTab="about"
      tabCounts={tabCounts}
      enableActivities={settings.enableActivities || false}
      enableSuccessStories={settings.enableSuccessStories !== false}
      isPowerGroupLead={membership?.powerGroupLead || false}
      siteId={settings.id}
      userData={userData}
      powerGroups={powerGroups}
      userEmail={user.email}
      pendingEmail={hasPendingEmailChange ? freshUser.pendingEmail : null}
    />
  )
}
