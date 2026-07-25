import { headers as getHeaders } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import slugify from 'slugify'
import { MemberProfileHeader, MemberProfileTabs, Breadcrumb } from '@/components'
import { SuccessStoryCard } from '@/components/SuccessStoryCard'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { getCurrentSite } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'

function generateSlug(name: string, surname: string): string {
  return slugify(`${name}-${surname}`, { lower: true, strict: true })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const currentSite = await getCurrentSite()
  if (!currentSite) return { title: 'Member Not Found' }

  const membershipsData = await payload.find({
    collection: 'site-memberships',
    where: {
      site: { equals: currentSite.id },
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
    title: `${memberUser?.name} ${memberUser?.surname} - Success Stories`,
    description: `View ${memberUser?.name} ${memberUser?.surname}'s success stories`,
  }
}

export default async function MemberSuccessStoriesPage({
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

  const currentSite = await getCurrentSite()
  if (!currentSite) {
    redirect('/login')
  }

  // Check if success stories feature is enabled
  if (currentSite.enableSuccessStories === false) {
    redirect(`/members`)
  }

  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  const membershipsData = await payload.find({
    collection: 'site-memberships',
    where: {
      site: { equals: currentSite.id },
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

  const [specialRequestsData, top40Data, successStoriesData] = await Promise.all([
    payload.find({
      collection: 'special-requests',
      where: {
        and: [
          { requestedBy: { equals: memberUser.id } },
          { site: { equals: currentSite.id } },
        ],
      },
      limit: 0,
    }),
    payload.find({
      collection: 'top40',
      where: {
        and: [
          { submittedBy: { equals: memberUser.id } },
          { site: { equals: currentSite.id } },
        ],
      },
      limit: 0,
    }),
    payload.find({
      collection: 'success-stories',
      where: {
        and: [
          { author: { equals: memberUser.id } },
          { isPublic: { equals: true } },
          { site: { equals: currentSite.id } },
        ],
      },
      limit: 100,
      sort: '-createdAt',
      depth: 1,
    }),
  ])

  const memberLogo =
    membership.logo && typeof membership.logo === 'object' && membership.logo.url
      ? { url: membership.logo.url, alt: membership.logo.alt }
      : null
  const memberProfileImage =
    membership.profileImage && typeof membership.profileImage === 'object' && membership.profileImage.url
      ? { url: membership.profileImage.url, alt: membership.profileImage.alt }
      : null

  const memberTop20Count = (
    await payload.find({
      collection: 'top20',
      where: {
        and: [{ submittedBy: { equals: memberUser.id } }, { site: { equals: currentSite.id } }],
      },
      limit: 0,
    })
  ).totalDocs

  const memberSlug = generateSlug(memberUser.name, memberUser.surname)

  return (
    <div className="bg-neutral-50 dark:bg-surface min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb
          items={[
            { label: t('common', 'home'), href: '/' },
            { label: t('members', 'title'), href: '/members' },
            { label: `${memberUser.name} ${memberUser.surname}`, href: `/members/${memberSlug}` },
            { label: t('profile', 'successStories') },
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
          activeTab="success-stories"
          specialRequestsCount={specialRequestsData.totalDocs}
          top40Count={top40Data.totalDocs}
          top20Count={memberTop20Count}
          successStoriesCount={successStoriesData.totalDocs}
          enableSuccessStories={true}
          labels={{
            about: t('profile', 'about'),
            specialRequests: t('members', 'specialRequests'),
            top40: t('members', 'top40'),
            top20: t('members', 'top20'),
            successStories: t('profile', 'successStories'),
          }}
        />

        <h2 className="text-lg font-bold text-ink dark:text-surface-text mb-4">
          {memberUser.name.toUpperCase()} - {t('profile', 'successStories').toUpperCase()}
        </h2>
        {successStoriesData.docs.length > 0 ? (
          <div className="space-y-4">
            {successStoriesData.docs.map((story) => (
              <SuccessStoryCard
                key={story.id}
                story={{
                  id: String(story.id),
                  title: story.title,
                  story: story.story,
                  businessValue: story.businessValue,
                  partnerMember:
                    story.partnerMember && typeof story.partnerMember === 'object'
                      ? {
                          id: String(story.partnerMember.id),
                          name: story.partnerMember.name,
                          surname: story.partnerMember.surname,
                          slug: generateSlug(story.partnerMember.name, story.partnerMember.surname),
                        }
                      : null,
                  createdAt: story.createdAt,
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
            {t('profile', 'noSuccessStories')}
          </p>
        )}
      </div>
    </div>
  )
}
