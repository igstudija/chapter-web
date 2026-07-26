import { headers as getHeaders } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import {
  MemberProfileHeader,
  MemberProfileTabs,
  Breadcrumb,
  SpecialRequestCard,
} from '@/components'
import slugify from 'slugify'
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
    title: `${memberUser?.name} ${memberUser?.surname} - Special Requests`,
    description: `View ${memberUser?.name} ${memberUser?.surname}'s special requests`,
  }
}

export default async function MemberSpecialRequestsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
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

  const [specialRequestsData, top40Data, successStoriesData, top20Data] = await Promise.all([
    payload.find({
      collection: 'special-requests',
      where: { requestedBy: { equals: memberUser.id } },
      limit: 100,
      sort: '-createdAt',
    }),
    payload.count({
      collection: 'top40',
      where: { submittedBy: { equals: memberUser.id } },
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
            { label: t('members', 'specialRequests') },
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
          activeTab="special-requests"
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
        <div className="mb-6">
          <h2 className="display-2 text-ink dark:text-surface-text">
            {t('members', 'specialRequests')}
          </h2>
        </div>
        {specialRequestsData.docs.length > 0 ? (
          <div className="space-y-3">
            {specialRequestsData.docs.map((request) => (
              <SpecialRequestCard
                key={request.id}
                request={{
                  id: String(request.id),
                  request: request.request,
                  registrationNumber: request.registrationNumber,
                  createdAt: request.createdAt,
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
            {t('profile', 'noSpecialRequests')}
          </p>
        )}
      </div>
    </div>
  )
}
