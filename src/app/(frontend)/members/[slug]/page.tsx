import { headers as getHeaders } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { MemberAboutView, MemberProfileHeader, MemberProfileTabs, Breadcrumb } from '@/components'
import slugify from 'slugify'
import { getSettings } from '@/lib/getSiteSettings'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import type { Member, User as PayloadUser } from '@/payload-types'

function generateSlug(name: string, surname: string): string {
  return slugify(`${name}-${surname}`, { lower: true, strict: true })
}

// Helper type for membership with populated user
type MembershipWithUser = Member & {
  user: PayloadUser
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const settings = await getSettings()

  if (!settings) {
    return { title: 'Member Not Found' }
  }

  const membershipsData = await payload.find({
    collection: 'members',
    where: {
      status: { equals: 'active' },
    },
    limit: 100,
    depth: 1,
  })

  const membership = membershipsData.docs.find((m) => {
    const memberUser = typeof m.user === 'object' ? m.user : null
    if (!memberUser) return false
    return generateSlug(memberUser.name, memberUser.surname) === slug
  }) as MembershipWithUser | undefined

  if (!membership) {
    return { title: 'Member Not Found' }
  }

  const memberUser = membership.user

  return {
    title: `${memberUser.name} ${memberUser.surname} - ${membership.company}`,
    description: `View ${memberUser.name} ${memberUser.surname}'s profile from ${membership.company}`,
  }
}

export default async function MemberProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    redirect('/login')
  }

  const settings = await getSettings()
  if (!settings) {
    notFound()
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
    const memberUser = typeof m.user === 'object' ? m.user : null
    if (!memberUser) return false
    return generateSlug(memberUser.name, memberUser.surname) === slug
  }) as MembershipWithUser | undefined

  if (!membership) {
    notFound()
  }

  const memberUser = membership.user

  const [specialRequestsData, top40Data, successStoriesData, top20Data] = await Promise.all([
    payload.count({
      collection: 'special-requests',
      where: { requestedBy: { equals: memberUser.id } },
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

  // Counted alongside the other three above rather than in a query of its own:
  // it blocked render for a full extra round trip while depending on nothing
  // that came before it.
  const memberTop20Count = top20Data.totalDocs

  return (
    <div className="bg-neutral-50 dark:bg-surface min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb
          items={[
            { label: t('common', 'home'), href: '/' },
            { label: t('members', 'title'), href: '/members' },
            { label: `${memberUser.name} ${memberUser.surname}` },
          ]}
        />

        <MemberProfileHeader
          member={{
            name: memberUser.name,
            surname: memberUser.surname,
            company: membership.company || '',
            jobPosition: membership.jobPosition || undefined,
            companyEmail: membership.companyEmail || undefined,
            phone: membership.phone || undefined,
            companyPhone: membership.companyPhone || undefined,
            website: membership.website || undefined,
            loginEmail: memberUser.email,
          }}
          profileImage={memberProfileImage}
          logo={memberLogo}
        />

        <MemberProfileTabs
          slug={slug}
          activeTab="about"
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

        {/* Read-only About Content */}
        <MemberAboutView
          member={{
            name: memberUser.name || '',
            surname: memberUser.surname || '',
            phone: membership.phone || '',
            loginEmail: memberUser.email,
            description: membership.description || '',
            company: membership.company || '',
            companyPhone: membership.companyPhone || '',
            companyEmail: membership.companyEmail || '',
            website: membership.website || '',
            companyDescription: membership.companyDescription || '',
            gallery: (membership.gallery || []).map((item) => ({
              id: item.id ? String(item.id) : null,
              image: item.image,
              caption: item.caption,
            })),
            profileImageUrl: memberProfileImage?.url || undefined,
            logoUrl: memberLogo?.url || undefined,
          }}
          labels={{
            about: t('profile', 'aboutSection'),
            noDescription: t('profile', 'noDescription'),
            company: t('profile', 'company'),
            gallery: t('profile', 'gallery'),
            contact: t('profile', 'contact'),
            personalContact: t('profile', 'personalContact'),
            companyContact: t('profile', 'companyContact'),
          }}
        />
      </div>
    </div>
  )
}
