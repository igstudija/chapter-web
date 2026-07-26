import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import config from '@/payload.config'
import { Calendar, MapPin, ArrowRight } from 'lucide-react'
import { EventRegistrationForm, PageHeader } from '@/components'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { headers } from 'next/headers'
import { generateMetadata as generateSeoMetadata, generateEventSchema } from '@/lib/seoHelpers'
import { JsonLd } from '@/components/JsonLd'
import type { Media } from '@/payload-types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const headersList = await headers()
  const host = headersList.get('host')
  const payload = await getPayload({ config })
  const currentSite = await getSettings()

  const [eventData, siteSettingsData] = await Promise.all([
    payload.find({
      collection: 'events',
      where: { slug: { equals: slug } },
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

  const event = eventData.docs[0]
  if (!event) return { title: 'Event Not Found' }

  const siteSettings = siteSettingsData.docs[0] as any
  const baseUrl = `https://${host}`

  return generateSeoMetadata({
    seo: (event as any).seo,
    contentTitle: event.title,
    contentImage: event.image as Media | undefined,
    siteSettings: siteSettings,
    siteBranding: siteSettings?.branding,
    baseUrl,
    pathname: `/events/${slug}`,
  })
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params
  const headersList = await headers()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: headersList })
  const isLoggedIn = !!user
  const currentSite = await getSettings()

  const publicFilter = isLoggedIn ? [] : [{ isPublic: { equals: true } }]

  const [eventData, otherEventsData, blogPostsData] = await Promise.all([
    payload.find({
      collection: 'events',
      where: {
        and: [
          { slug: { equals: slug } },
          { _status: { equals: 'published' } },
          ...publicFilter,
        ],
      },
      limit: 1,
      depth: 1,
    }),
    payload.find({
      collection: 'events',
      where: {
        and: [
          { slug: { not_equals: slug } },
          { _status: { equals: 'published' } },
          { date: { greater_than: new Date().toISOString() } },
          ...publicFilter,
        ],
      },
      limit: 5,
      sort: 'date',
      depth: 1,
    }),
    payload.find({
      collection: 'blog',
      where: { _status: { equals: 'published' } },
      limit: 5,
      sort: '-publishedAt',
      depth: 1,
    }),
  ])

  const event = eventData.docs[0]
  if (!event) notFound()

  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)
  const dateLocale = locale === 'lv' ? 'lv-LV' : 'en-US'
  const timezone = currentSite?.timezone || 'Europe/Riga'

  const formattedDate = new Date(event.date).toLocaleDateString(dateLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  })

  // Generate event schema for structured data
  const host = headersList.get('host')
  const baseUrl = `https://${host}`
  const eventSchema = generateEventSchema({
    name: event.title,
    description: typeof event.description === 'string' ? event.description : undefined,
    baseUrl,
    pathname: `/events/${slug}`,
    image: event.image as Media | undefined,
    startDate: event.date,
    location: event.location,
  })

  return (
    <article className="min-h-screen bg-paper dark:bg-surface">
      <JsonLd data={eventSchema} />
      <PageHeader
        title={event.title}
        breadcrumbs={[
          { label: t('common', 'home'), href: '/' },
          { label: t('events', 'title'), href: '/events' },
          { label: event.title },
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-14 lg:flex-row lg:gap-16">
          {/* Main Content */}
          <div className="lg:w-2/3">
            {/*
              When and where — the two things a reader opens an event page for.
              Set in the mono face on a ruled strip so they are found without
              being read, the same treatment the date chip on the event cards
              uses.
            */}
            <div className="mb-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line py-4 dark:border-line-dark">
              <div className="flex items-center gap-2.5 text-ink dark:text-surface-text">
                <Calendar className="h-4 w-4 shrink-0 text-brand" />
                <span className="tabular font-mono text-sm">{formattedDate}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2.5 text-ink dark:text-surface-text">
                  <MapPin className="h-4 w-4 shrink-0 text-brand" />
                  <span className="text-sm">{event.location}</span>
                </div>
              )}
            </div>

            {event.image && typeof event.image === 'object' && event.image.url && (
              <div className="mb-8 rounded-lg overflow-hidden">
                <Image
                  src={event.image.url}
                  alt={event.image.alt || event.title}
                  width={event.image.width || 1200}
                  height={event.image.height || 675}
                  className="w-full h-auto"
                />
              </div>
            )}

            {event.description && typeof event.description === 'string' && (
              <div
                className="prose prose-lg dark:prose-invert prose-headings:text-ink dark:prose-headings:text-surface-text prose-p:text-neutral-700 dark:prose-p:text-neutral-300 max-w-none mb-8"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            )}

            {/* Event Registration Form */}
            <EventRegistrationForm
              eventId={String(event.id)}
              eventTitle={event.title}
              translations={{
                title: t('eventRegistration', 'title'),
                fullName: t('eventRegistration', 'fullName'),
                emailAddress: t('eventRegistration', 'emailAddress'),
                phoneNumber: t('eventRegistration', 'phoneNumber'),
                company: t('eventRegistration', 'company'),
                invitedBy: t('eventRegistration', 'invitedBy'),
                messageOrQuestions: t('eventRegistration', 'messageOrQuestions'),
                registerNow: t('eventRegistration', 'registerNow'),
                submitting: t('eventRegistration', 'submitting'),
                successTitle: t('eventRegistration', 'successTitle'),
                successMessage: t('eventRegistration', 'successMessage'),
                fillFormSlowly: t('eventRegistration', 'fillFormSlowly'),
                failedToSubmit: t('eventRegistration', 'failedToSubmit'),
                somethingWentWrong: t('eventRegistration', 'somethingWentWrong'),
              }}
            />
          </div>

          {/* Sidebar */}
          <aside className="lg:w-1/3">
            <div className="sticky top-24 space-y-6">
              <div className="panel p-6">
                <h2 className="eyebrow mb-5">
                  {t('events', 'upcomingEvents')}
                </h2>

                {otherEventsData.docs.length > 0 ? (
                  <div className="space-y-4">
                    {otherEventsData.docs.map((otherEvent) => {
                      const eventDate = new Date(otherEvent.date)
                      return (
                        <Link
                          key={otherEvent.id}
                          href={`/events/${otherEvent.slug || otherEvent.id}`}
                          className="block group"
                        >
                          <div className="flex gap-3">
                            {otherEvent.image &&
                            typeof otherEvent.image === 'object' &&
                            otherEvent.image.url ? (
                              <div className="relative w-20 h-16 rounded overflow-hidden shrink-0">
                                <Image
                                  src={otherEvent.image.url}
                                  alt={otherEvent.image.alt || otherEvent.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-neutral-900">
                                <Calendar className="h-6 w-6 text-white" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-ink dark:text-surface-text group-hover:text-brand transition-colors line-clamp-2">
                                {otherEvent.title}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {eventDate.toLocaleDateString(dateLocale, {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    timeZone: timezone,
                                  })}{' '}
                                  {eventDate.toLocaleTimeString(dateLocale, {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZone: timezone,
                                  })}
                                </span>
                              </div>
                              {otherEvent.location && (
                                <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="line-clamp-1">{otherEvent.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                    {t('events', 'noUpcoming')}
                  </p>
                )}

                <Link
                  href="/events"
                  className="btn btn-line mt-6 w-full py-2.5 text-sm"
                >
                  {t('events', 'title')} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Blog Posts Section */}
              <div className="panel p-6">
                <h2 className="eyebrow mb-5">
                  {t('blog', 'recentPosts')}
                </h2>

                {blogPostsData.docs.length > 0 ? (
                  <div className="space-y-4">
                    {blogPostsData.docs.map((post) => {
                      const publishedDate = post.publishedAt
                        ? new Date(post.publishedAt)
                        : new Date(post.createdAt)
                      return (
                        <Link
                          key={post.id}
                          href={`/blog/${post.slug || post.id}`}
                          className="block group"
                        >
                          <div className="flex gap-3">
                            {post.featuredImage &&
                            typeof post.featuredImage === 'object' &&
                            post.featuredImage.url ? (
                              <div className="relative w-20 h-16 rounded overflow-hidden shrink-0">
                                <Image
                                  src={post.featuredImage.url}
                                  alt={post.featuredImage.alt || post.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-neutral-900">
                                <Calendar className="h-6 w-6 text-white" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-ink dark:text-surface-text group-hover:text-brand transition-colors line-clamp-2">
                                {post.title}
                              </p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                {publishedDate.toLocaleDateString(dateLocale, {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                    {t('blog', 'noRecentPosts')}
                  </p>
                )}

                <Link
                  href="/blog"
                  className="btn btn-line mt-6 w-full py-2.5 text-sm"
                >
                  {t('blog', 'title')} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </article>
  )
}
