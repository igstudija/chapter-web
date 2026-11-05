import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getSettings } from './getSiteSettings'
import { DEFAULT_LOCALE, getTranslations, type Locale } from './i18n'
import { generateMetadata as generateSeoMetadata, plainTextFrom, siteOrigin } from './seoHelpers'
import { buildPlaceholders, replacePolicyPlaceholders } from './policyUtils'

type PolicyType = 'privacy' | 'terms' | 'cookies'

const FALLBACK_TITLE_KEY = {
  privacy: 'privacyPolicy',
  terms: 'termsOfUse',
  cookies: 'cookiePolicy',
} as const

/**
 * Metadata for the three policy pages, from the same localised template the
 * page renders.
 *
 * They used to export a static English `metadata` — "Privacy Policy",
 * "Terms and Conditions" — on a Latvian site whose page headings, read from
 * the Latvian template, said "Privātuma politika". The title a search result
 * shows now matches the heading, and the description is the policy's opening
 * rather than the layout's fallback.
 */
export async function legalPageMetadata(type: PolicyType, pathname: string): Promise<Metadata> {
  const [settings, payload, headersList] = await Promise.all([
    getSettings(),
    getPayload({ config }),
    headers(),
  ])
  const locale = (settings?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  const { docs } = await payload.find({
    collection: 'policy-templates',
    where: { and: [{ type: { equals: type } }, { locale: { equals: locale } }] },
    limit: 1,
  })
  const template = docs[0]
  const content = template?.content
    ? replacePolicyPlaceholders(
        template.content,
        buildPlaceholders(settings, template.lastUpdated, locale),
      )
    : ''

  return generateSeoMetadata({
    contentTitle: template?.title || t('footer', FALLBACK_TITLE_KEY[type]),
    contentDescription: plainTextFrom(content, 160) || undefined,
    siteSettings: settings as never,
    siteBranding: settings,
    baseUrl: siteOrigin() || `https://${headersList.get('host')}`,
    pathname,
  })
}
