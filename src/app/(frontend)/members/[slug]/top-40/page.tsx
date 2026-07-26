import { headers as getHeaders } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import slugify from 'slugify'
import { Top40Table, MemberProfileHeader, MemberProfileTabs, Breadcrumb } from '@/components'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'

function generateSlug(name: string, surname: string): string {
  return slugify(`${name}-${surname}`, { lower: true, strict: true })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const settings = await getSettings()
  if (!settings) return { title: 'Member Not Found' }

  const membershipsData = await payload.find({
    collection: 'members',
    where: {
      status: { equals: 'active' },
    },
    limit: 100,
    depth: 1,
  })

  const membership = membershipsData.docs.find((m) => {
    const memberUser = m.user && typeof m.user === 'object' ? m.user : null
    return memberUser && generateSlug(memberUser.name, memberUser.surname) === slug
  })

  if (!membership) {
    return { title: 'Member Not Found' }
  }

  const memberUser = membership.user && typeof membership.user === 'object' ? membership.user : null

  return {
    title: `${memberUser?.name} ${memberUser?.surname} - Top 40`,
    description: `View ${memberUser?.name} ${memberUser?.surname}'s Top 40`,
  }
}

export default async function MemberTop40Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
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

  const membershipsData = await payload.find({
    collection: 'members',
    where: {
      status: { equals: 'active' },
    },
    limit: 100,
    depth: 2,
  })

  const membership = membershipsData.docs.find((m) => {
    const memberUser = m.user && typeof m.user === 'object' ? m.user : null
    return memberUser && generateSlug(memberUser.name, memberUser.surname) === slug
  })

  if (!membership) {
    notFound()
  }

  const memberUser = membership.user && typeof membership.user === 'object' ? membership.user : null
  if (!memberUser) {
    notFound()
  }

  const [top40Data, specialRequestsData, successStoriesData, top20Data] = await Promise.all([
    payload.find({
      collection: 'top40',
      where: { submittedBy: { equals: memberUser.id } },
      limit: 100,
      sort: '-createdAt',
    }),
    payload.count({
      collection: 'special-requests',
      where: { requestedBy: { equals: memberUser.id } },
    }),
    payload.count({
      collection: 'success-stories',
      where: { author: { equals: memberUser.id } },
    }),
    payload.count({
      collection: 'top20',
      where: { submittedBy: { equals: memberUser.id } },
    }),
  ])

  const memberLogo =
    membership.logo && typeof membership.logo === 'object' && membership.logo.url
      ? { url: membership.logo.url, alt: membership.logo.alt }
      : null
  const memberProfileImage =
    membership.profileImage &&
    typeof membership.profileImage === 'object' &&
    membership.profileImage.url
      ? { url: membership.profileImage.url, alt: membership.profileImage.alt }
      : null

  const memberTop20Count = top20Data.totalDocs

  const memberSlug = generateSlug(memberUser.name, memberUser.surname)

  return (
    <div className="bg-neutral-50 dark:bg-surface min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb
          items={[
            { label: t('common', 'home'), href: '/' },
            { label: t('members', 'title'), href: '/members' },
            { label: `${memberUser.name} ${memberUser.surname}`, href: `/members/${memberSlug}` },
            { label: t('members', 'top40') },
          ]}
        />

        <MemberProfileHeader
          member={{
            name: memberUser.name,
            surname: memberUser.surname,
            company: membership.company || '',
            jobPosition: membership.jobPosition || '',
            companyEmail: membership.companyEmail || '',
            phone: membership.phone || '',
            companyPhone: membership.companyPhone || '',
            website: membership.website || '',
          }}
          profileImage={memberProfileImage}
          logo={memberLogo}
        />

        <MemberProfileTabs
          slug={memberSlug}
          activeTab="top-40"
          specialRequestsCount={specialRequestsData.totalDocs}
          top40Count={top40Data.totalDocs}
          top20Count={memberTop20Count}
          successStoriesCount={successStoriesData.totalDocs}
          enableSuccessStories={settings.enableSuccessStories !== false}
          labels={{
            about: t('profile', 'about'),
            specialRequests: t('members', 'specialRequests'),
            top40: t('members', 'top40'),
            top20: t('members', 'top20'),
            successStories: t('profile', 'successStories'),
          }}
        />

        {/* Content */}
        <h2 className="display-2 mb-6 text-ink dark:text-surface-text">
          {t('members', 'top40')}
        </h2>
        <Top40Table
          entries={top40Data.docs}
          memberName={`${memberUser.name}_${memberUser.surname}`}
        />
      </div>
    </div>
  )
}
