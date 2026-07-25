import { getPayload } from 'payload'
import config from '@/payload.config'
import { BlogCard } from '@/components'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { headers } from 'next/headers'
import { generateMetadata as generateSeoMetadata } from '@/lib/seoHelpers'

export async function generateMetadata() {
  const headersList = await headers()
  const host = headersList.get('host')
  const currentSite = await getSettings()

  if (!currentSite) {
    return { title: 'Blog' }
  }

  const payload = await getPayload({ config })

  const [listingSeoData, siteSettingsData] = await Promise.all([
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

  const listingSeo = listingSeoData.docs[0] as any
  const siteSettings = siteSettingsData.docs[0] as any
  const baseUrl = `https://${host}`

  return generateSeoMetadata({
    seo: listingSeo?.blogPage?.seo,
    contentTitle: listingSeo?.blogPage?.pageTitle || 'Blog',
    contentDescription: listingSeo?.blogPage?.pageDescription || 'Latest news and articles from our organisation.',
    siteSettings: siteSettings,
    siteBranding: siteSettings?.branding,
    baseUrl,
    pathname: '/blog',
  })
}

export default async function BlogPage() {
  const payload = await getPayload({ config })
  const currentSite = await getSettings()
  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  const blogData = await payload.find({
    collection: 'blog',
    limit: 12,
    sort: '-publishedAt',
    where: { _status: { equals: 'published' } },
  })

  return (
    <div className="py-8 bg-neutral-100 dark:bg-surface min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          <Link href="/" className="hover:text-brand transition-colors">
            {t('common', 'home')}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-ink dark:text-surface-text font-medium">
            {t('blog', 'title')}
          </span>
        </nav>

        <h1 className="text-4xl font-bold text-ink dark:text-surface-text mb-8">
          {t('blog', 'title')}
        </h1>

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
                    ? {
                        url: post.featuredImage.url || '',
                        alt: post.featuredImage.alt || post.title,
                      }
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-neutral-500 dark:text-neutral-400 text-lg">{t('blog', 'noPosts')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
