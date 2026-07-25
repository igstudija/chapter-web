import { getPayload } from 'payload'
import config from '@/payload.config'
import Link from 'next/link'
import Image from 'next/image'
import slugify from 'slugify'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { getCurrentSite } from '@/lib/getSiteSettings'
import type { SiteMembership } from '@/payload-types'
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
    const currentSite = await getCurrentSite()
    const siteId = currentSite?.id

    if (!currentSite) {
      return { title: 'Companies' }
    }

    const payload = await getPayload({ config })

    const [companiesSettingsData, listingSeoData, siteSettingsData] = await Promise.all([
      payload.find({
        collection: 'companies-page-settings',
        where: { site: { equals: siteId } },
        limit: 1,
        depth: 1,
      }),
      payload.find({
        collection: 'listing-pages-seo',
        where: { site: { equals: siteId } },
        limit: 1,
        depth: 1,
      }),
      payload.find({
        collection: 'site-settings-collection',
        where: { site: { equals: siteId } },
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

  const currentSite = await getCurrentSite()
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
        collection: 'site-memberships',
        limit: 100,
        where: {
          site: { equals: currentSite.id },
          status: { equals: 'active' },
        },
        depth: 1,
      }),
      payload.find({
        collection: 'power-groups',
        limit: 100,
        sort: 'title',
      }),
      payload.find({
        collection: 'top40',
        where: { site: { equals: currentSite.id } },
        limit: 5000,
        depth: 1,
      }),
      payload.find({
        collection: 'special-requests',
        where: { site: { equals: currentSite.id } },
        limit: 5000,
        depth: 1,
      }),
      payload.find({
        collection: 'companies-page-settings',
        where: { site: { equals: currentSite.id } },
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
  type MemberWithRating = SiteMembership & { rating: number }
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
        className="bg-white border border-neutral-200 dark:border-neutral-600 rounded-lg p-4 flex items-center justify-center h-24 hover:shadow-md hover:border-brand dark:hover:border-brand transition-all"
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
          <span className="text-sm font-medium text-ink dark:text-surface-text text-center">
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
    <div className="bg-neutral-50 dark:bg-surface min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm mb-6">
          <Link href="/" className="text-neutral-500 dark:text-neutral-400 hover:text-brand">
            {t('common', 'home')}
          </Link>
          <span className="mx-2 text-neutral-400 dark:text-neutral-500">›</span>
          <span className="text-ink dark:text-surface-text">{t('companies', 'title')}</span>
        </nav>

        <h1 className="text-3xl font-bold text-ink dark:text-surface-text mb-4">
          {pageTitle.toUpperCase()}
        </h1>
        <h2 className="text-xl font-semibold text-ink dark:text-surface-text mb-2">
          {subtitle}
        </h2>
        <p className="text-neutral-600 dark:text-neutral-300 mb-6 max-w-3xl">{description}</p>
        <Link
          href={ctaLink}
          className="inline-block bg-brand text-white px-6 py-3 rounded-lg hover:bg-brand-dark transition-colors font-semibold mb-12"
        >
          {ctaLabel}
        </Link>

        {sortedGroups.map((group) => (
          <section key={group.groupId} className="mb-12">
            <h3 className="text-xl font-bold text-ink dark:text-surface-text mb-6">
              {group.title}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {group.members.map(renderMemberCard)}
            </div>
          </section>
        ))}

        {membershipsData.docs.length === 0 && (
          <div className="text-center py-16">
            <p className="text-neutral-500 dark:text-neutral-400 text-lg">
              {t('companies', 'noMembersYet')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
