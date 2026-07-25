import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import FAQClient from './FAQClient'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, ArrowRight, Calendar, MapPin } from 'lucide-react'
import { headers } from 'next/headers'
import { generateMetadata as generateSeoMetadata, generateFAQSchema } from '@/lib/seoHelpers'
import { JsonLd } from '@/components/JsonLd'

export async function generateMetadata() {
  const headersList = await headers()
  const host = headersList.get('host')
  const currentSite = await getSettings()
  const siteId = currentSite?.id

  if (!currentSite) {
    return { title: 'FAQ' }
  }

  const payload = await getPayload({ config })

  const [faqData, siteSettingsData] = await Promise.all([
    payload.find({
      collection: 'faq-settings',
      where: siteId ? { site: { equals: siteId } } : {},
      limit: 1,
    }),
    payload.find({
      collection: 'settings',
      where: { site: { equals: siteId } },
      limit: 1,
      depth: 1,
    }),
  ])

  const faq = faqData.docs[0] as any
  const siteSettings = siteSettingsData.docs[0] as any
  const baseUrl = `https://${host}`

  return generateSeoMetadata({
    seo: faq?.seo,
    contentTitle: faq?.pageTitle || 'FAQ',
    contentDescription: faq?.pageDescription,
    siteSettings: siteSettings,
    siteBranding: siteSettings?.branding,
    baseUrl,
    pathname: '/faq',
  })
}

export default async function FaqPage() {
  const payload = await getPayload({ config })
  const currentSite = await getSettings()
  const siteId = currentSite?.id

  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  const [faqResult, eventsData, blogPostsData] = await Promise.all([
    payload.find({
      collection: 'faq-settings',
      where: siteId ? { site: { equals: siteId } } : {},
      limit: 1,
    }),
    payload.find({
      collection: 'events',
      where: {
        and: [
          { _status: { equals: 'published' } },
          { date: { greater_than: new Date().toISOString() } },
          ...(siteId ? [{ site: { equals: siteId } }] : []),
        ],
      },
      limit: 5,
      sort: 'date',
      depth: 1,
    }),
    payload.find({
      collection: 'blog',
      where: {
        and: [
          { _status: { equals: 'published' } },
          ...(siteId ? [{ site: { equals: siteId } }] : []),
        ],
      },
      limit: 5,
      sort: '-publishedAt',
      depth: 1,
    }),
  ])

  const faqData = faqResult.docs[0]
  const dateLocale = locale === 'lv' ? 'lv-LV' : 'en-US'

  // Use translated title if no FAQ settings found or pageTitle is empty
  const pageTitle = faqData?.pageTitle || t('faq', 'title')
  const pageDescription = faqData?.pageDescription
  const faqs = faqData?.faqs || []

  // Generate FAQ schema for structured data
  // Convert rich text answers to plain text for schema
  const faqSchemaData = faqs.map((faq: any) => ({
    question: faq.question,
    answer: typeof faq.answer === 'string'
      ? faq.answer.replace(/<[^>]*>/g, '') // Strip HTML tags
      : '',
  }))
  const faqSchema = generateFAQSchema(faqSchemaData)

  return (
    <div className="py-8">
      <JsonLd data={faqSchema} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          <Link href="/" className="hover:text-brand transition-colors">
            {t('common', 'home')}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-ink dark:text-surface-text font-medium">{pageTitle}</span>
        </nav>

        <div className="mb-12">
          <h1 className="text-4xl font-bold text-ink dark:text-surface-text mb-4">
            {pageTitle}
          </h1>
          {pageDescription && (
            <p className="text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl">
              {pageDescription}
            </p>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Main Content */}
          <div className="lg:w-2/3">
            {faqs.length > 0 ? (
              <FAQClient
                faqs={faqs}
                labels={{
                  all: t('faq', 'all'),
                  noFaqsInCategory: t('faq', 'noFaqsInCategory'),
                }}
              />
            ) : (
              <div className="bg-white dark:bg-surface-raised rounded-lg shadow-md p-8 text-center">
                <p className="text-neutral-500 dark:text-neutral-400">{t('faq', 'noFaqs')}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:w-1/3">
            <div className="sticky top-24 space-y-6">
              {/* Events Section */}
              <div className="bg-neutral-50 dark:bg-surface-raised rounded-lg p-6">
                <h2 className="text-xl font-bold text-ink dark:text-surface-text mb-4">
                  {t('events', 'upcomingEvents')}
                </h2>

                {eventsData.docs.length > 0 ? (
                  <div className="space-y-4">
                    {eventsData.docs.map((event) => {
                      const eventDate = new Date(event.date)
                      return (
                        <Link
                          key={event.id}
                          href={`/events/${event.slug || event.id}`}
                          className="block group"
                        >
                          <div className="flex gap-3">
                            {event.image && typeof event.image === 'object' && event.image.url ? (
                              <div className="relative w-20 h-16 rounded overflow-hidden shrink-0">
                                <Image
                                  src={event.image.url}
                                  alt={event.image.alt || event.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-20 h-16 rounded bg-brand flex items-center justify-center shrink-0">
                                <Calendar className="h-6 w-6 text-white" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-ink dark:text-surface-text group-hover:text-brand transition-colors line-clamp-2">
                                {event.title}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {eventDate.toLocaleDateString(dateLocale, {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  })}{' '}
                                  {eventDate.toLocaleTimeString(dateLocale, {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="line-clamp-1">{event.location}</span>
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
                  className="mt-6 w-full bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {t('events', 'title')} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Blog Posts Section */}
              <div className="bg-neutral-50 dark:bg-surface-raised rounded-lg p-6">
                <h2 className="text-xl font-bold text-ink dark:text-surface-text mb-4">
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
                              <div className="w-20 h-16 rounded bg-brand flex items-center justify-center shrink-0">
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
                  className="mt-6 w-full bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {t('blog', 'title')} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
