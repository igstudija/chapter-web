import { getPayload } from 'payload'
import config from '@/payload.config'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getCurrentSite, getSiteSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { replacePolicyPlaceholders, buildPlaceholders } from '@/lib/policyUtils'

export default async function CookiePolicyPage() {
  const payload = await getPayload({ config })
  const currentSite = await getCurrentSite()
  const siteSettings = await getSiteSettings()

  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)
  const dateLocale = locale === 'lv' ? 'lv-LV' : 'en-US'

  // Get policy template from universal templates
  const templateResult = await payload.find({
    collection: 'policy-templates',
    where: {
      and: [{ type: { equals: 'cookies' } }, { locale: { equals: locale } }],
    },
    limit: 1,
  })

  const template = templateResult.docs[0]
  const pageTitle = template?.title || t('footer', 'cookiePolicy')

  // Build placeholders and replace in content
  const placeholders = buildPlaceholders(currentSite, siteSettings, template?.lastUpdated, locale)
  const processedContent = template?.content
    ? replacePolicyPlaceholders(template.content, placeholders)
    : ''

  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          <Link href="/" className="hover:text-brand transition-colors">
            {t('common', 'home')}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-ink dark:text-surface-text font-medium">{pageTitle}</span>
        </nav>

        {/* Page Title */}
        <h1 className="text-4xl font-bold text-ink dark:text-surface-text mb-2">
          {pageTitle}
        </h1>
        {template?.lastUpdated && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8">
            {t('common', 'lastUpdated')}:{' '}
            {new Date(template.lastUpdated).toLocaleDateString(dateLocale)}
          </p>
        )}

        {/* Content with Prose */}
        {processedContent && (
          <div
            className="prose prose-lg dark:prose-invert prose-headings:font-bold prose-headings:text-ink dark:prose-headings:text-surface-text prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-a:text-brand prose-a:underline hover:prose-a:text-brand-dark prose-strong:font-bold prose-strong:text-ink dark:prose-strong:text-surface-text prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-1 prose-p:text-neutral-700 dark:prose-p:text-neutral-300 max-w-none"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        )}
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Cookie Policy',
}
