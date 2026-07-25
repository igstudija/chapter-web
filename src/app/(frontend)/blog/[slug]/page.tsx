import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import config from '@/payload.config'
import { Breadcrumb } from '@/components'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { Calendar, MapPin, ArrowRight, FileText } from 'lucide-react'
import { headers } from 'next/headers'
import { generateMetadata as generateSeoMetadata, generateArticleSchema } from '@/lib/seoHelpers'
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

  const [postData, siteSettingsData] = await Promise.all([
    payload.find({
      collection: 'blog',
      where: {
        and: [
          { slug: { equals: slug } },
        ],
      },
      limit: 1,
      depth: 1,
    }),
    payload.find({
      collection: 'settings',
      where: { site: { equals: currentSite?.id } },
      limit: 1,
      depth: 1,
    }),
  ])

  const post = postData.docs[0]
  if (!post) return { title: 'Post Not Found' }

  const siteSettings = siteSettingsData.docs[0] as any
  const baseUrl = `https://${host}`

  return generateSeoMetadata({
    seo: (post as any).seo,
    contentTitle: post.title,
    contentDescription: post.excerpt,
    contentImage: post.featuredImage as Media | undefined,
    siteSettings: siteSettings,
    siteBranding: siteSettings?.branding,
    baseUrl,
    pathname: `/blog/${slug}`,
  })
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const currentSite = await getSettings()

  const [postData, recentPostsData, eventsData] = await Promise.all([
    payload.find({
      collection: 'blog',
      where: {
        and: [
          { slug: { equals: slug } },
        ],
      },
      limit: 1,
      depth: 2,
    }),
    payload.find({
      collection: 'blog',
      where: {
        and: [
          { _status: { equals: 'published' } },
        ],
      },
      limit: 5,
      sort: '-publishedAt',
      depth: 1,
    }),
    payload.find({
      collection: 'events',
      where: {
        and: [
          { date: { greater_than_equal: new Date().toISOString() } },
        ],
      },
      limit: 5,
      sort: 'date',
      depth: 1,
    }),
  ])

  const post = postData.docs[0]
  if (!post) notFound()

  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)
  const dateLocale = locale === 'lv' ? 'lv-LV' : 'en-US'

  const recentPosts = recentPostsData.docs.filter((p) => p.id !== post.id).slice(0, 4)

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(dateLocale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  // Generate article schema for structured data
  const headersList = await headers()
  const host = headersList.get('host')
  const baseUrl = `https://${host}`
  const articleSchema = generateArticleSchema({
    title: post.title,
    description: post.excerpt,
    baseUrl,
    pathname: `/blog/${slug}`,
    image: post.featuredImage as Media | undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
  })

  return (
    <article className="py-8 bg-neutral-100 dark:bg-surface min-h-screen">
      <JsonLd data={articleSchema} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: t('common', 'home'), href: '/' },
            { label: t('blog', 'title'), href: '/blog' },
            { label: post.title },
          ]}
        />

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl md:text-4xl font-bold text-ink dark:text-surface-text mb-2 uppercase">
              {post.title}
            </h1>
            {formattedDate && (
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                {new Date(post.publishedAt!).toLocaleDateString('lv-LV', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </p>
            )}

            {post.featuredImage &&
              typeof post.featuredImage === 'object' &&
              post.featuredImage.url && (
                <div className="mb-8 rounded-lg overflow-hidden">
                  <Image
                    src={post.featuredImage.url}
                    alt={post.featuredImage.alt || post.title}
                    width={post.featuredImage.width || 1200}
                    height={post.featuredImage.height || 675}
                    className="w-full h-auto"
                  />
                </div>
              )}

            {post.content && typeof post.content === 'string' && (
              <div
                className="prose prose-lg max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Events Widget */}
              <div className="bg-white dark:bg-surface-raised rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-ink dark:text-surface-text mb-4">
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
                              <div className="relative w-16 h-16 rounded overflow-hidden shrink-0">
                                <Image
                                  src={event.image.url}
                                  alt={event.image.alt || event.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded bg-brand flex items-center justify-center shrink-0">
                                <FileText className="h-6 w-6 text-white" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
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

              {/* Recent Posts Widget */}
              <div className="bg-white dark:bg-surface-raised rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-ink dark:text-surface-text mb-4">
                  {t('blog', 'recentPosts')}
                </h2>
                {recentPosts.length > 0 ? (
                  <div className="space-y-4">
                    {recentPosts.map((recentPost) => (
                      <Link
                        key={recentPost.id}
                        href={`/blog/${recentPost.slug || recentPost.id}`}
                        className="flex gap-3 group"
                      >
                        {recentPost.featuredImage &&
                          typeof recentPost.featuredImage === 'object' &&
                          recentPost.featuredImage.url && (
                            <div className="relative w-16 h-16 shrink-0 rounded overflow-hidden">
                              <Image
                                src={recentPost.featuredImage.url}
                                alt={recentPost.featuredImage.alt || recentPost.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-ink dark:text-surface-text group-hover:text-brand transition-colors line-clamp-2">
                            {recentPost.title}
                          </h3>
                          {recentPost.publishedAt && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                              {new Date(recentPost.publishedAt).toLocaleDateString(dateLocale, {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                    {t('blog', 'noRecentPosts')}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </article>
  )
}
