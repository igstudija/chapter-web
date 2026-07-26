import { getPayload } from 'payload'
import config from '@/payload.config'
import { BlogCard, PageHeader } from '@/components'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
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
    <div className="min-h-screen bg-paper dark:bg-surface">
      <PageHeader
        title={t('blog', 'title')}
        breadcrumbs={[{ label: t('common', 'home'), href: '/' }, { label: t('blog', 'title') }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
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
          <p className="border-t border-line py-12 text-sm text-ink-soft dark:border-line-dark dark:text-neutral-400">
            {t('blog', 'noPosts')}
          </p>
        )}
      </div>
    </div>
  )
}
