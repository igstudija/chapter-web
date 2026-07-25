import { getPayload } from 'payload'
import config from '@/payload.config'
import { EventCard } from '@/components'
import Link from 'next/link'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { headers } from 'next/headers'
import { generateMetadata as generateSeoMetadata } from '@/lib/seoHelpers'

export async function generateMetadata() {
  const headersList = await headers()
  const host = headersList.get('host')
  const currentSite = await getSettings()
  const siteId = currentSite?.id

  if (!currentSite) {
    return { title: 'Events' }
  }

  const payload = await getPayload({ config })

  const [listingSeoData, siteSettingsData] = await Promise.all([
    payload.find({
      collection: 'listing-pages-seo',
      where: { site: { equals: siteId } },
      limit: 1,
      depth: 1,
    }),
    payload.find({
      collection: 'settings',
      where: { site: { equals: siteId } },
      limit: 1,
      depth: 1,
    }),
  ])

  const listingSeo = listingSeoData.docs[0] as any
  const siteSettings = siteSettingsData.docs[0] as any
  const baseUrl = `https://${host}`

  return generateSeoMetadata({
    seo: listingSeo?.eventsPage?.seo,
    contentTitle: listingSeo?.eventsPage?.pageTitle || 'Events',
    contentDescription: listingSeo?.eventsPage?.pageDescription || 'Upcoming events and meetings at our organisation.',
    siteSettings: siteSettings,
    siteBranding: siteSettings?.branding,
    baseUrl,
    pathname: '/events',
  })
}

export default async function EventsPage() {
  const headersList = await headers()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: headersList })
  const isLoggedIn = !!user
  const currentSite = await getSettings()
  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  const eventsData = await payload.find({
    collection: 'events',
    limit: 20,
    sort: 'date',
    where: {
      and: [
        { _status: { equals: 'published' } },
        ...(isLoggedIn ? [] : [{ isPublic: { equals: true } }]),
      ],
    },
    depth: 1,
  })

  const now = new Date()
  const upcomingEvents = eventsData.docs.filter((e) => new Date(e.date) >= now)

  return (
    <div className="bg-neutral-50 dark:bg-surface min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm mb-6">
          <Link href="/" className="text-neutral-500 dark:text-neutral-400 hover:text-brand">
            {t('common', 'home')}
          </Link>
          <span className="mx-2 text-neutral-400 dark:text-neutral-500">›</span>
          <span className="text-ink dark:text-surface-text">{t('events', 'title')}</span>
        </nav>

        <h1 className="text-3xl font-bold text-ink dark:text-surface-text mb-8">
          {t('events', 'title').toUpperCase()}
        </h1>

        {upcomingEvents.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                title={event.title}
                date={event.date}
                location={event.location || undefined}
                slug={event.slug || String(event.id)}
                timezone={currentSite?.timezone || 'Europe/Riga'}
                image={
                  event.image && typeof event.image === 'object'
                    ? { url: event.image.url || '', alt: event.image.alt ?? undefined }
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 dark:text-neutral-400 mb-12">
            {t('events', 'noUpcoming')}
          </p>
        )}
      </div>
    </div>
  )
}
