import { getPayload } from 'payload'
import config from '@/payload.config'
import Link from 'next/link'
import Image from 'next/image'
import slugify from 'slugify'
import { PageHeader, Reveal } from '@/components'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { getSettings } from '@/lib/getSiteSettings'
import type { Member } from '@/payload-types'
import { headers } from 'next/headers'
import { generateMetadata as generateSeoMetadata } from '@/lib/seoHelpers'

function extractUserId(relationshipField: any): string | undefined {
  if (typeof relationshipField === 'number') {
    return String(relationshipField)
  }
  if (typeof relationshipField === 'object' && relationshipField?.id) {
    return String(relationshipField.id)
  }
  return undefined
}

export async function generateMetadata() {
  try {
    const headersList = await headers()
    const host = headersList.get('host')
    const currentSite = await getSettings()

    if (!currentSite) {
      return { title: 'Companies' }
    }

    const payload = await getPayload({ config })

    const [companiesSettingsData, listingSeoData, siteSettingsData] = await Promise.all([
      payload.find({
        collection: 'companies-page-settings',
        where: {},
        limit: 1,
        depth: 1,
      }),
      payload.find({
        collection: 'listing-pages-seo',
        where: {},
        limit: 1,
        depth: 1,
      }),
      payload.find({
        collection: 'settings',
        where: {},
        limit: 1,
        depth: 1,
      }),
    ])

    const companiesSettings = companiesSettingsData.docs[0] as any
    const listingSeo = listingSeoData.docs[0] as any
    const siteSettings = siteSettingsData.docs[0] as any
    const baseUrl = `https://${host}`

    // Prefer companies-page-settings SEO, fallback to listing-pages-seo
    const seo = companiesSettings?.seo || listingSeo?.companiesPage?.seo

    return generateSeoMetadata({
      seo,
      contentTitle: companiesSettings?.title || listingSeo?.companiesPage?.pageTitle || 'Companies',
      contentDescription:
        companiesSettings?.description ||
        listingSeo?.companiesPage?.pageDescription ||
        'Browse companies in our organisation.',
      siteSettings: siteSettings,
      siteBranding: siteSettings?.branding,
      baseUrl,
      pathname: '/companies',
    })
  } catch (error) {
    console.error('Error generating companies metadata:', error)
    return { title: 'Companies' }
  }
}

export default async function CompaniesPage() {
  const payload = await getPayload({ config })

  const currentSite = await getSettings()
  if (!currentSite) {
    return (
      <div className="bg-neutral-50 dark:bg-surface min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-neutral-500">Site not found</p>
        </div>
      </div>
    )
  }

  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  const [membershipsData, powerGroupsData, top40Data, specialRequestsData, companiesSettingsData] =
    await Promise.all([
      payload.find({
        collection: 'members',
        limit: 100,
        where: {
          status: { equals: 'active' },
        },
        depth: 1,
      }),
      payload.find({
        collection: 'power-groups',
        limit: 100,
        sort: 'title',
      }),
      // Counted per member below, nothing else read. See the same pair in
      // members/page.tsx for why depth 0 + select rather than depth 1.
      payload.find({
        collection: 'top40',
        where: {},
        limit: 5000,
        depth: 0,
        select: { submittedBy: true },
      }),
      payload.find({
        collection: 'special-requests',
        where: {},
        limit: 5000,
        depth: 0,
        select: { requestedBy: true },
      }),
      payload.find({
        collection: 'companies-page-settings',
        where: {},
        limit: 1,
        depth: 1,
      }),
    ])

  const settings = companiesSettingsData.docs[0] as any

  // Count top40 and special requests per user for rating calculation
  const top40CountByUser = new Map<string, number>()
  for (const entry of top40Data.docs) {
    const userId = extractUserId(entry.submittedBy)
    if (userId) {
      top40CountByUser.set(userId, (top40CountByUser.get(userId) || 0) + 1)
    }
  }

  const specialRequestsCountByUser = new Map<string, number>()
  for (const entry of specialRequestsData.docs) {
    const userId = extractUserId(entry.requestedBy)
    if (userId) {
      specialRequestsCountByUser.set(userId, (specialRequestsCountByUser.get(userId) || 0) + 1)
    }
  }

  // Enrich memberships with rating data
  type MemberWithRating = Member & { rating: number }
  const membersWithRating: MemberWithRating[] = membershipsData.docs.map((m) => {
    const memberUser = m.user && typeof m.user === 'object' ? m.user : null
    const userId = String(memberUser?.id || (typeof m.user === 'string' ? m.user : ''))
    const top40Count = top40CountByUser.get(userId) || 0
    const specialCount = specialRequestsCountByUser.get(userId) || 0
    return { ...m, rating: top40Count + specialCount }
  })

  // Group by power group
  const groupedMembers = membersWithRating.reduce(
    (acc, member) => {
      const pg = member.powerGroup
      const groupId = pg && typeof pg === 'object' ? pg.id : 'ungrouped'
      const groupTitle =
        pg && typeof pg === 'object' ? pg.title : t('common', 'other')

      if (!acc[groupId]) {
        acc[groupId] = { title: groupTitle, members: [], totalRating: 0 }
      }
      acc[groupId].members.push(member)
      acc[groupId].totalRating += member.rating
      return acc
    },
    {} as Record<string, { title: string; members: MemberWithRating[]; totalRating: number }>,
  )

  // Sort groups by average rating (highest first), ungrouped last
  // Sort members within groups by individual rating
  const sortedGroups = Object.entries(groupedMembers)
    .map(([groupId, group]) => {
      const avgRating = group.members.length > 0 ? group.totalRating / group.members.length : 0
      const sortedMembers = [...group.members].sort((a, b) => b.rating - a.rating)
      return { groupId, title: group.title, members: sortedMembers, avgRating }
    })
    .sort((a, b) => {
      if (a.groupId === 'ungrouped') return 1
      if (b.groupId === 'ungrouped') return -1
      return b.avgRating - a.avgRating
    })

  const renderMemberCard = (membership: MemberWithRating) => {
    const logo = membership.logo && typeof membership.logo === 'object' ? membership.logo : null

    return (
      <Link
        key={membership.id}
        href={'/companies/' + slugify(membership.company || '', { lower: true, strict: true })}
        className="logo-cell h-28"
      >
        {logo?.url ? (
          <Image
            src={logo.url}
            alt={logo.alt || membership.company || ''}
            width={120}
            height={60}
            className="max-h-14 w-auto object-contain"
          />
        ) : (
          <span className="text-center text-sm font-medium text-neutral-900">
            {membership.company}
          </span>
        )}
      </Link>
    )
  }

  // Use settings with translation fallbacks
  const pageTitle = settings?.title || t('companies', 'title')
  const subtitle = settings?.subtitle || t('companies', 'visitUs')
  const description = settings?.description || t('companies', 'visitUsDescription')
  const ctaLabel = settings?.ctaLabel || t('companies', 'visitUs').toUpperCase()
  const ctaLink = settings?.ctaLink || '/contacts'

  return (
    <div className="min-h-screen bg-paper dark:bg-surface">
      <PageHeader
        title={pageTitle}
        eyebrow={subtitle}
        lead={description}
        breadcrumbs={[
          { label: t('common', 'home'), href: '/' },
          { label: t('companies', 'title') },
        ]}
        action={
          <Link href={ctaLink} className="btn btn-primary">
            {ctaLabel}
          </Link>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {/*
          The roster is grouped by power group, and each group holds one seat
          per profession — that exclusivity is the whole membership model. The
          count is therefore not decoration: it says how full the table is. It
          rides in the same hairline-and-tick device the homepage uses for its
          section marks.
        */}
        {sortedGroups.map((group, groupIndex) => (
          <Reveal as="section" key={group.groupId} delay={groupIndex * 40} className="mb-14 last:mb-0">
            <div className="mb-6 flex items-baseline gap-4">
              <h2 className="font-display text-xl font-bold tracking-tight text-ink dark:text-surface-text md:text-2xl">
                {group.title}
              </h2>
              <span
                className="tabular font-mono text-xs text-ink-soft dark:text-neutral-500"
                aria-label={`${group.members.length}`}
              >
                {String(group.members.length).padStart(2, '0')}
              </span>
              <span
                className="h-px flex-1 bg-line dark:bg-line-dark"
                aria-hidden="true"
              />
            </div>
            <div className="logo-wall grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {group.members.map(renderMemberCard)}
            </div>
          </Reveal>
        ))}

        {membershipsData.docs.length === 0 && (
          <p className="border-t border-line py-12 text-sm text-ink-soft dark:border-line-dark dark:text-neutral-400">
            {t('companies', 'noMembersYet')}
          </p>
        )}
      </div>
    </div>
  )
}
