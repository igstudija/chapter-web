import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import Link from 'next/link'
import { PageHeader } from '@/components'
import { headers as getHeaders } from 'next/headers'
import { generateMetadata as generateSeoMetadata } from '@/lib/seoHelpers'
import { redirect } from 'next/navigation'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function getExcerpt(page: any): string {
  // Try main content field first
  if (page.content) {
    const text = stripHtml(String(page.content))
    if (text) return text.slice(0, 150)
  }
  // Fall back to layout blocks
  if (page.layout?.length) {
    for (const block of page.layout) {
      if (block.blockType === 'content-section' && block.content) {
        const text = stripHtml(String(block.content))
        if (text) return text.slice(0, 150)
      }
      if (block.blockType === 'hero' && block.subheading) {
        return String(block.subheading).slice(0, 150)
      }
    }
  }
  return ''
}

export async function generateMetadata() {
  const headersList = await getHeaders()
  const host = headersList.get('host')
  const currentSite = await getSettings()

  if (!currentSite) {
    return { title: 'Wiki' }
  }

  const payload = await getPayload({ config })

  const siteSettingsData = await payload.find({
    collection: 'settings',
    where: {},
    limit: 1,
    depth: 1,
  })

  const siteSettings = siteSettingsData.docs[0] as any
  const baseUrl = `https://${host}`

  return generateSeoMetadata({
    contentTitle: 'Wiki',
    siteSettings: siteSettings,
    siteBranding: siteSettings?.branding,
    baseUrl,
    pathname: '/wiki',
  })
}

export default async function WikiPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    redirect('/login')
  }

  const currentSite = await getSettings()
  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  const wikiData = await payload.find({
    collection: 'wiki',
    limit: 100,
    sort: 'title',
    where: { _status: { equals: 'published' } },
  })

  return (
    <div className="min-h-screen bg-paper dark:bg-surface">
      <PageHeader
        title={t('wiki', 'title')}
        breadcrumbs={[{ label: t('common', 'home'), href: '/' }, { label: t('wiki', 'title') }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        {wikiData.docs.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {wikiData.docs.map((page) => (
                <Link
                  key={page.id}
                  href={`/wiki/${page.slug}`}
                  className="block bg-white dark:bg-neutral-800 rounded-lg p-6 hover:shadow-md transition-all"
                >
                  <h2 className="text-lg font-semibold text-ink dark:text-surface-text">
                    {page.title}
                  </h2>
                </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-neutral-500 dark:text-neutral-400 text-lg">
              {t('wiki', 'noPages')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
