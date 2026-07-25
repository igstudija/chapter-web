import { notFound, redirect } from 'next/navigation'
import { getPayload, type Where } from 'payload'
import config from '@/payload.config'
import { headers as getHeaders } from 'next/headers'
import { generateMetadata as generateSeoMetadata } from '@/lib/seoHelpers'
import { getCurrentSite } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { MemberCard } from '@/components/MemberCard'
import slugify from 'slugify'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function WikiDetailPage({ params }: PageProps) {
  const { slug } = await params
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    redirect('/login')
  }

  const currentSite = await getCurrentSite()
  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  const siteFilter: Where = currentSite ? { site: { equals: currentSite.id } } : {}

  const [wikiResult, allWikiPages, top40Data, specialRequestsData] = await Promise.all([
    payload.find({
      collection: 'wiki',
      where: {
        slug: { equals: slug },
        ...siteFilter,
      },
      limit: 1,
      depth: 2,
    }),
    payload.find({
      collection: 'wiki',
      where: {
        and: [
          { _status: { equals: 'published' } },
          ...(currentSite ? [{ site: { equals: currentSite.id } }] : []),
        ],
      },
      limit: 100,
      sort: 'title',
    }),
    payload.find({
      collection: 'top40',
      where: siteFilter,
      limit: 5000,
      depth: 1,
    }),
    payload.find({
      collection: 'special-requests',
      where: siteFilter,
      limit: 5000,
      depth: 1,
    }),
  ])

  const page = wikiResult.docs[0]

  if (!page) {
    notFound()
  }

  // Count top40 and special requests per user
  const top40CountByUser = new Map<string, number>()
  for (const entry of top40Data.docs) {
    const u = entry.submittedBy
    const userId = typeof u === 'object' && u ? String(u.id) : typeof u === 'number' ? String(u) : undefined
    if (userId) top40CountByUser.set(userId, (top40CountByUser.get(userId) || 0) + 1)
  }

  const specialRequestsCountByUser = new Map<string, number>()
  for (const entry of specialRequestsData.docs) {
    const u = entry.requestedBy
    const userId = typeof u === 'object' && u ? String(u.id) : typeof u === 'number' ? String(u) : undefined
    if (userId) specialRequestsCountByUser.set(userId, (specialRequestsCountByUser.get(userId) || 0) + 1)
  }

  return (
    <div className="py-8 bg-neutral-100 dark:bg-surface min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          <Link href="/" className="hover:text-brand transition-colors">
            {t('common', 'home')}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/wiki" className="hover:text-brand transition-colors">
            {t('wiki', 'title')}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-ink dark:text-surface-text font-medium">
            {page.title}
          </span>
        </nav>

        <div className="flex gap-8">
          {/* Sidebar — hidden on mobile */}
          <aside className="hidden lg:block w-64 shrink-0">
            <nav className="sticky top-24">
              <ul className="space-y-1">
                {allWikiPages.docs.map((wikiPage) => (
                  <li key={wikiPage.id}>
                    <Link
                      href={`/wiki/${wikiPage.slug}`}
                      className={`block px-3 py-2 rounded text-sm transition-colors ${
                        wikiPage.slug === slug
                          ? 'bg-neutral-200 dark:bg-neutral-700 font-medium text-ink dark:text-white'
                          : 'text-neutral-600 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {wikiPage.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main content */}
          <article className="flex-1 min-w-0">
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <h1 className="text-4xl font-bold text-ink dark:text-surface-text mb-8">
                {page.title}
              </h1>

              {page.content && (
                <div
                  className="text-neutral-700 dark:text-neutral-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: page.content }}
                />
              )}

              {page.layout && page.layout.length > 0 && (
                <div className="mt-12 space-y-12">
                  {page.layout.map((block: any, index: number) => {
                    switch (block.blockType) {
                      case 'hero':
                        return (
                          <div
                            key={block.id || `hero-${index}`}
                            className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-8"
                          >
                            <h2 className="text-3xl font-bold text-ink dark:text-surface-text mb-4">
                              {block.heading}
                            </h2>
                            {block.subheading && (
                              <p className="text-xl text-neutral-600 dark:text-neutral-400">
                                {block.subheading}
                              </p>
                            )}
                          </div>
                        )

                      case 'content-section':
                        return (
                          <div
                            key={block.id || `content-${index}`}
                            className="prose max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: block.content }}
                          />
                        )

                      case 'faq':
                        return (
                          <div key={block.id || `faq-${index}`} className="space-y-6">
                            {block.heading && (
                              <h2 className="text-3xl font-bold text-ink dark:text-surface-text mb-6">
                                {block.heading}
                              </h2>
                            )}
                            <div className="space-y-4">
                              {block.items?.map((item: any, i: number) => (
                                <details
                                  key={item.id || `faq-item-${i}`}
                                  className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg p-6"
                                >
                                  <summary className="font-semibold text-ink dark:text-surface-text cursor-pointer">
                                    {item.question}
                                  </summary>
                                  <div
                                    className="mt-4 text-neutral-600 dark:text-neutral-400 prose dark:prose-invert"
                                    dangerouslySetInnerHTML={{ __html: item.answer }}
                                  />
                                </details>
                              ))}
                            </div>
                          </div>
                        )

                      case 'contact-info':
                        return (
                          <div
                            key={block.id || `contact-${index}`}
                            className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-8"
                          >
                            {block.heading && (
                              <h2 className="text-3xl font-bold text-ink dark:text-surface-text mb-6">
                                {block.heading}
                              </h2>
                            )}
                            <div className="space-y-4 text-neutral-700 dark:text-neutral-300">
                              {block.email && (
                                <p>
                                  <strong>Email:</strong>{' '}
                                  <a href={`mailto:${block.email}`} className="text-brand">
                                    {block.email}
                                  </a>
                                </p>
                              )}
                              {block.phone && (
                                <p>
                                  <strong>Phone:</strong> {block.phone}
                                </p>
                              )}
                              {block.address && (
                                <p>
                                  <strong>Address:</strong>
                                  <br />
                                  {block.address}
                                </p>
                              )}
                            </div>
                          </div>
                        )

                      case 'team-grid':
                        return (
                          <div key={block.id || `team-${index}`} className="not-prose">
                            {block.heading && (
                              <h2 className="text-3xl font-bold text-ink dark:text-surface-text mb-6">
                                {block.heading}
                              </h2>
                            )}
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                              {block.members?.map((membership: any) => {
                                if (!membership || typeof membership !== 'object') return null
                                const memberUser =
                                  membership.user && typeof membership.user === 'object'
                                    ? membership.user
                                    : null
                                const userIdStr = memberUser ? String(memberUser.id) : ''
                                const profileImage =
                                  membership.profileImage &&
                                  typeof membership.profileImage === 'object'
                                    ? {
                                        url: membership.profileImage.url || '',
                                        alt: membership.profileImage.alt || undefined,
                                      }
                                    : undefined
                                const logo =
                                  membership.logo && typeof membership.logo === 'object'
                                    ? {
                                        url: membership.logo.url || '',
                                        alt: membership.logo.alt || '',
                                      }
                                    : undefined
                                return (
                                  <MemberCard
                                    key={membership.id}
                                    id={slugify(
                                      `${memberUser?.name || ''}-${memberUser?.surname || ''}`,
                                      { lower: true, strict: true },
                                    )}
                                    name={memberUser?.name || ''}
                                    surname={memberUser?.surname || ''}
                                    company={membership.company || ''}
                                    jobPosition={membership.jobPosition || undefined}
                                    orgRole={membership.orgRole || undefined}
                                    profileImage={profileImage}
                                    logo={logo}
                                    phone={membership.phone || undefined}
                                    email={memberUser?.email || undefined}
                                    specialRequestsCount={specialRequestsCountByUser.get(userIdStr) || 0}
                                    top40Count={top40CountByUser.get(userIdStr) || 0}
                                  />
                                )
                              })}
                            </div>
                          </div>
                        )

                      default:
                        return null
                    }
                  })}
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const headersList = await getHeaders()
  const host = headersList.get('host')
  const payload = await getPayload({ config })
  const currentSite = await getCurrentSite()

  try {
    const [wikiData, siteSettingsData] = await Promise.all([
      payload.find({
        collection: 'wiki',
        where: {
          slug: { equals: slug },
          ...(currentSite ? { site: { equals: currentSite.id } } : {}),
        },
        limit: 1,
        depth: 1,
      }),
      currentSite
        ? payload.find({
            collection: 'site-settings-collection',
            where: { site: { equals: currentSite.id } },
            limit: 1,
            depth: 1,
          })
        : Promise.resolve({ docs: [] }),
    ])

    const page = wikiData.docs[0]

    if (!page) {
      return { title: 'Page Not Found' }
    }

    const siteSettings = siteSettingsData.docs[0] as any
    const baseUrl = `https://${host}`

    return generateSeoMetadata({
      seo: (page as any).seo,
      contentTitle: page.title,
      siteSettings: siteSettings,
      siteBranding: siteSettings?.branding,
      baseUrl,
      pathname: `/wiki/${slug}`,
    })
  } catch (error) {
    console.error(`[wiki] generateMetadata error for /wiki/${slug}:`, error)
    return { title: 'Page Not Found' }
  }
}
