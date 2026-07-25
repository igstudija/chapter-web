import Link from 'next/link'
import Image from 'next/image'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { EventCard, BlogCard } from '@/components'
import { ArrowRight } from 'lucide-react'
import type { Media } from '@/payload-types'
import { isSuperadminHost, getSiteFromHost } from '@/lib/getSiteFromHost'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { SuperadminDashboard } from '@/components/superadmin/SuperadminDashboard'
import { SuperadminLoginForm } from '@/components/superadmin/SuperadminLoginForm'
import {
  generateMetadata as generateSeoMetadata,
  generateOrganizationSchema,
} from '@/lib/seoHelpers'
import { JsonLd } from '@/components/JsonLd'
import { DEFAULT_ORG_NAME, SUPERADMIN_TITLE } from '@/lib/branding'

export async function generateMetadata() {
  const headersList = await headers()
  const host = headersList.get('host')

  // Skip for superadmin
  if (host && isSuperadminHost(host)) {
    return { title: SUPERADMIN_TITLE }
  }

  const currentSite = await getSiteFromHost(host)
  const siteId = currentSite?.id

  if (!currentSite) {
    return { title: DEFAULT_ORG_NAME }
  }

  const payload = await getPayload({ config })

  const [homepageData, siteSettingsData] = await Promise.all([
    payload.find({
      collection: 'homepage-settings',
      where: siteId ? { site: { equals: siteId } } : {},
      limit: 1,
      depth: 1,
    }),
    payload.find({
      collection: 'site-settings-collection',
      where: siteId ? { site: { equals: siteId } } : {},
      limit: 1,
      depth: 1,
    }),
  ])

  const homepage = homepageData.docs[0] as any
  const siteSettings = siteSettingsData.docs[0] as any

  const baseUrl = `https://${host}`

  return generateSeoMetadata({
    seo: homepage?.seo,
    contentTitle: homepage?.hero?.title,
    contentDescription: homepage?.hero?.description,
    siteSettings: siteSettings,
    siteBranding: siteSettings?.branding,
    homepageHero: homepage,
    baseUrl,
    pathname: '/',
  })
}

export default async function HomePage() {
  const headersList = await headers()
  const host = headersList.get('host')
  const payload = await getPayload({ config })

  // === SUPERADMIN HOST: Show login or dashboard ===
  if (host && isSuperadminHost(host)) {
    const { user } = await payload.auth({ headers: headersList })

    // Not logged in or not superadmin - show login form
    if (!user || !user.isSuperadmin) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {SUPERADMIN_TITLE}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Sign in to manage all organisations
              </p>
            </div>
            <SuperadminLoginForm />
          </div>
        </div>
      )
    }

    // Logged in as superadmin - show dashboard
    const [sitesResult, usersResult, membershipsResult] = await Promise.all([
      payload.find({ collection: 'sites', limit: 1000, sort: 'name' }),
      payload.find({ collection: 'users', limit: 1000, sort: 'email' }),
      payload.find({ collection: 'site-memberships', limit: 2000, sort: '-createdAt', depth: 1 }),
    ])

    return (
      <SuperadminDashboard
        sites={sitesResult.docs}
        users={usersResult.docs}
        memberships={membershipsResult.docs}
        currentUser={user}
      />
    )
  }

  // === CHAPTER SITE: Show homepage ===
  const currentSite = await getSiteFromHost(host)
  const siteId = currentSite?.id

  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  const { user } = await payload.auth({ headers: headersList })

  // Fetch site-scoped homepage settings and site settings
  const [homepageData, siteSettingsData] = await Promise.all([
    payload.find({
      collection: 'homepage-settings',
      where: siteId ? { site: { equals: siteId } } : {},
      limit: 1,
      depth: 1,
    }),
    payload.find({
      collection: 'site-settings-collection',
      where: siteId ? { site: { equals: siteId } } : {},
      limit: 1,
      depth: 1,
    }),
  ])

  const homepage = homepageData.docs[0] || null
  const siteSettings = siteSettingsData.docs[0] as any

  // Generate organization schema for structured data
  const baseUrl = `https://${host}`
  const organizationSchema = generateOrganizationSchema({
    siteSettings: siteSettings,
    siteBranding: siteSettings?.branding,
    baseUrl,
  })

  const [eventsData, blogData] = await Promise.all([
    payload.find({
      collection: 'events',
      limit: 3,
      sort: 'date',
      where: {
        _status: { equals: 'published' },
        date: { greater_than: new Date().toISOString() },
        ...(siteId ? { site: { equals: siteId } } : {}),
        ...(!user ? { isPublic: { equals: true } } : {}),
      },
      depth: 1,
    }),
    payload.find({
      collection: 'blog',
      limit: 3,
      sort: '-publishedAt',
      where: {
        _status: { equals: 'published' },
        ...(siteId ? { site: { equals: siteId } } : {}),
      },
    }),
  ])

  const hero = homepage?.hero
  const stats = homepage?.stats
  const cta = homepage?.cta
  const backgroundImage =
    hero?.backgroundImage && typeof hero.backgroundImage === 'object'
      ? (hero.backgroundImage as Media)
      : null

  return (
    <>
      {/* Structured Data */}
      <JsonLd data={organizationSchema} />

      {/* Hero Section */}
      <section className="relative bg-linear-to-br from-ink to-neutral-800 text-white py-24 overflow-hidden">
        {/* Background Image */}
        {backgroundImage?.url && (
          <>
            <Image
              src={backgroundImage.url}
              alt={backgroundImage.alt || 'Hero background'}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            {/* Overlay */}
            {hero?.enableOverlay && (
              <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
            )}
          </>
        )}

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {hero?.title?.split(hero?.highlightedText || '').map((part, i, arr) =>
              i < arr.length - 1 ? (
                <span key={`title-part-${i}-${part.substring(0, 10)}`}>
                  {part}
                  <span className="text-brand">{hero?.highlightedText}</span>
                </span>
              ) : (
                <span key={`title-part-${i}-${part.substring(0, 10)}`}>{part}</span>
              ),
            )}
          </h1>
          <p className="text-xl text-neutral-300 max-w-2xl mx-auto mb-8">{hero?.description}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={hero?.primaryButtonLink || '/companies'}
              className="bg-brand text-white px-8 py-3 rounded-lg hover:bg-brand-dark transition-colors font-semibold"
            >
              {hero?.primaryButtonText || t('home', 'viewMembers')}
            </Link>
            <Link
              href={hero?.secondaryButtonLink || '/contacts'}
              className="bg-white text-ink px-8 py-3 rounded-lg hover:bg-neutral-100 transition-colors font-semibold"
            >
              {hero?.secondaryButtonText || t('contacts', 'title')}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-brand py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {stats?.title || t('home', 'statsTitle')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {stats?.items?.map((stat, index) => {
              const defaultIcons = [
                'solar:wallet-money-bold-duotone',
                'solar:calendar-bold-duotone',
                'solar:armchair-bold-duotone',
                'solar:users-group-rounded-bold-duotone',
                'solar:hand-money-bold-duotone',
                'mdi:handshake',
              ]
              const iconName = stat.icon || defaultIcons[index] || 'mdi:chart-line'
              return (
                <div key={stat.id} className="text-center">
                  <div className="flex justify-center mb-4">
                    <img
                      src={`https://api.iconify.design/${iconName}.svg?color=%23ffffff`}
                      alt=""
                      className="h-16 w-16"
                    />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-red-100 mt-2">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-16 dark:bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-ink dark:text-surface-text">
              {t('home', 'upcomingEvents')}
            </h2>
            <Link
              href="/events"
              className="text-brand hover:text-brand-dark font-medium flex items-center gap-2"
            >
              {t('common', 'viewAll')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {eventsData.docs.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {eventsData.docs.map((event) => (
                <EventCard
                  key={event.id}
                  title={event.title}
                  date={event.date}
                  location={event.location || undefined}
                  slug={String(event.slug || event.id)}
                  image={
                    event.image && typeof event.image === 'object'
                      ? { url: event.image.url || '', alt: event.image.alt || undefined }
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
              {t('home', 'noUpcomingEvents')}
            </p>
          )}
        </div>
      </section>

      {/* Latest Blog Posts */}
      <section className="py-16 bg-white dark:bg-surface-raised">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-ink dark:text-surface-text">
              {t('home', 'latestNews')}
            </h2>
            <Link
              href="/blog"
              className="text-brand hover:text-brand-dark font-medium flex items-center gap-2"
            >
              {t('common', 'viewAll')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {blogData.docs.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {blogData.docs.map((post) => (
                <BlogCard
                  key={post.id}
                  title={post.title}
                  excerpt={post.excerpt || undefined}
                  slug={post.slug || String(post.id)}
                  publishedAt={post.publishedAt || undefined}
                  featuredImage={
                    post.featuredImage && typeof post.featuredImage === 'object'
                      ? { url: post.featuredImage.url || '', alt: post.featuredImage.alt || '' }
                      : undefined
                  }
                  variant="homepage"
                />
              ))}
            </div>
          ) : (
            <p className="text-neutral-500 text-center py-8">{t('home', 'noBlogPosts')}</p>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-brand py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {cta?.title || t('home', 'ctaTitle')}
          </h2>
          <p className="text-red-100 mb-8 max-w-2xl mx-auto">
            {cta?.description || t('home', 'ctaDescription')}
          </p>
          <Link
            href={cta?.buttonLink || '/contacts'}
            className="bg-white text-brand px-8 py-3 rounded-lg hover:bg-neutral-100 transition-colors font-semibold inline-block"
          >
            {cta?.buttonText || t('home', 'getInTouch')}
          </Link>
        </div>
      </section>
    </>
  )
}
