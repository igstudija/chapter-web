import type { Metadata } from 'next'
import type { Media } from '../payload-types'
import { DEFAULT_ORG_NAME } from './branding'

/**
 * SEO data structure from Payload collections
 */
export interface SeoData {
  metaTitle?: string | null
  metaDescription?: string | null
  keywords?: string | null
  ogTitle?: string | null
  ogDescription?: string | null
  ogImage?: Media | string | null
  canonicalUrl?: string | null
  noIndex?: boolean | null
  noFollow?: boolean | null
}

/**
 * Site SEO settings structure
 */
export interface SiteSeoSettings {
  seo?: {
    defaultTitle?: string | null
    titleSuffix?: string | null
    defaultDescription?: string | null
    defaultKeywords?: string | null
    ogSiteName?: string | null
    defaultOgImage?: Media | string | null
    twitterCard?: 'summary' | 'summary_large_image' | null
    twitterSite?: string | null
    googleVerification?: string | null
    bingVerification?: string | null
  } | null
}

/**
 * Site branding for fallback values
 */
export interface SiteBranding {
  siteName?: string | null
  siteLogo?: Media | string | null
}

/**
 * Homepage hero for default OG content
 */
export interface HomepageHero {
  hero?: {
    title?: string | null
    description?: string | null
  } | null
}

/** The placeholder a Settings document is created with before anyone names it. */
const PLACEHOLDER_ORG_NAME = 'Your Organisation'

/**
 * The organisation's name as entered in Settings, falling back to the
 * NEXT_PUBLIC_DEFAULT_ORG_NAME env var.
 *
 * Settings' Branding tab is unnamed, so `siteName` sits on the document itself —
 * there is no `settings.branding`. Reading that non-existent group is how the
 * name never reached a title, og:site_name or the Organization schema.
 */
export function orgNameFrom(settings?: { siteName?: string | null } | null): string {
  const name = settings?.siteName?.trim()
  if (name && name !== PLACEHOLDER_ORG_NAME) return name
  return DEFAULT_ORG_NAME
}

/** Open Graph locale for an interface language: `lv` -> `lv_LV`. */
export function ogLocale(locale?: string | null): string {
  switch (locale) {
    case 'lt':
      return 'lt_LT'
    case 'et':
      return 'et_EE'
    case 'en':
      return 'en_GB'
    case 'lv':
    default:
      return 'lv_LV'
  }
}

/**
 * The public origin from NEXT_PUBLIC_SERVER_URL, without a trailing slash, or
 * null when it is unset or not a URL.
 */
export function siteOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SERVER_URL?.trim()
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

/**
 * Plain text from CMS rich text (TinyMCE HTML), for meta descriptions and
 * JSON-LD. Search engines show a description verbatim, so `<p>` and `&nbsp;`
 * must not reach them.
 */
export function plainTextFrom(html: unknown, maxLength = 300): string {
  if (typeof html !== 'string' || !html) return ''
  const text = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= maxLength) return text
  const cut = text.slice(0, maxLength - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/** Social profile URLs from Settings' Social Media tab, in a stable order. */
export function socialProfileUrls(
  settings?: { socialMedia?: Record<string, string | null | undefined> | null } | null,
): string[] {
  const social = settings?.socialMedia
  if (!social) return []
  return ['facebook', 'instagram', 'linkedin', 'tiktok', 'twitter', 'youtube']
    .map((key) => social[key]?.trim())
    .filter((url): url is string => Boolean(url && /^https?:\/\//.test(url)))
}

/**
 * Get media URL from Media object or string
 */
function getMediaUrl(media: Media | string | null | undefined, baseUrl: string): string | null {
  if (!media) return null
  if (typeof media === 'string') return media
  if (media.url) {
    // If URL is relative, prepend base URL
    if (media.url.startsWith('/')) {
      return `${baseUrl}${media.url}`
    }
    return media.url
  }
  return null
}

/**
 * Generate Next.js Metadata from SEO fields
 *
 * Priority order for values:
 * 1. Page-specific SEO fields
 * 2. Content fields (title, excerpt, etc.)
 * 3. Site SEO defaults
 * 4. Site branding
 * 5. Homepage hero (for OG defaults)
 */
export function generateMetadata({
  seo,
  contentTitle,
  contentDescription,
  contentImage,
  siteSettings,
  siteBranding,
  homepageHero,
  baseUrl,
  pathname,
}: {
  seo?: SeoData | null
  contentTitle?: string | null
  contentDescription?: string | null
  contentImage?: Media | string | null
  siteSettings?: SiteSeoSettings | null
  siteBranding?: SiteBranding | null
  homepageHero?: HomepageHero | null
  baseUrl: string
  pathname?: string
}): Metadata {
  const siteSeo = siteSettings?.seo
  const titleSuffix = siteSeo?.titleSuffix || ''

  // Build title
  const orgName = orgNameFrom(siteBranding)
  const pageTitle = seo?.metaTitle || contentTitle || siteSeo?.defaultTitle || orgName
  const fullTitle = titleSuffix && !pageTitle.includes(titleSuffix)
    ? `${pageTitle}${titleSuffix}`
    : pageTitle

  // Build description
  const description =
    seo?.metaDescription ||
    contentDescription ||
    siteSeo?.defaultDescription ||
    homepageHero?.hero?.description ||
    ''

  // Build OG title and description
  const ogTitle = seo?.ogTitle || seo?.metaTitle || contentTitle || homepageHero?.hero?.title || pageTitle
  const ogDescription = seo?.ogDescription || description

  // Build OG image URL
  const ogImageUrl =
    getMediaUrl(seo?.ogImage, baseUrl) ||
    getMediaUrl(contentImage, baseUrl) ||
    getMediaUrl(siteSeo?.defaultOgImage, baseUrl) ||
    getMediaUrl(siteBranding?.siteLogo, baseUrl)

  // Build canonical URL
  const canonicalUrl = seo?.canonicalUrl || (pathname ? `${baseUrl}${pathname}` : baseUrl)

  // Build robots directives
  const robots: Metadata['robots'] = {}
  if (seo?.noIndex) robots.index = false
  if (seo?.noFollow) robots.follow = false

  // Build keywords
  const keywords = seo?.keywords || siteSeo?.defaultKeywords || undefined

  const metadata: Metadata = {
    title: fullTitle,
    description: description || undefined,
    keywords: keywords || undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: Object.keys(robots).length > 0 ? robots : undefined,
    openGraph: {
      title: ogTitle,
      description: ogDescription || undefined,
      url: canonicalUrl,
      // A page's openGraph replaces the layout's wholesale, so the site-wide
      // fields are repeated here or they vanish from every real page.
      siteName: siteSeo?.ogSiteName || orgName,
      locale: ogLocale((siteSettings as { locale?: string | null } | null)?.locale),
      type: 'website',
      ...(ogImageUrl && {
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: ogTitle,
          },
        ],
      }),
    },
    twitter: {
      card: siteSeo?.twitterCard || 'summary_large_image',
      title: ogTitle,
      description: ogDescription || undefined,
      ...(siteSeo?.twitterSite && { site: siteSeo.twitterSite }),
      ...(ogImageUrl && { images: [ogImageUrl] }),
    },
  }

  // Add verification codes if present
  if (siteSeo?.googleVerification || siteSeo?.bingVerification) {
    metadata.verification = {}
    if (siteSeo.googleVerification) {
      metadata.verification.google = siteSeo.googleVerification
    }
    if (siteSeo.bingVerification) {
      metadata.verification.other = { 'msvalidate.01': siteSeo.bingVerification }
    }
  }

  return metadata
}

/**
 * Generate JSON-LD structured data for organization
 */
export function generateOrganizationSchema({
  siteSettings,
  siteBranding,
  baseUrl,
}: {
  siteSettings?: {
    schema?: {
      organizationType?: string | null
      organizationName?: string | null
      organizationLogo?: Media | string | null
      foundingDate?: string | null
      address?: {
        streetAddress?: string | null
        city?: string | null
        postalCode?: string | null
        country?: string | null
      } | null
      contactPhone?: string | null
      contactEmail?: string | null
      sameAs?: Array<{ url?: string | null }> | null
    } | null
  } | null
  siteBranding?: SiteBranding | null
  baseUrl: string
}): object | null {
  const schema = siteSettings?.schema
  const name = schema?.organizationName || orgNameFrom(siteBranding)
  if (!name) return null

  const logoUrl = getMediaUrl(schema?.organizationLogo, baseUrl) || getMediaUrl(siteBranding?.siteLogo, baseUrl)

  const orgSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schema?.organizationType || 'Organization',
    name,
    url: baseUrl,
  }

  if (logoUrl) {
    orgSchema.logo = logoUrl
  }

  if (schema?.foundingDate) {
    orgSchema.foundingDate = schema.foundingDate
  }

  if (schema?.address?.streetAddress || schema?.address?.city) {
    orgSchema.address = {
      '@type': 'PostalAddress',
      ...(schema.address.streetAddress && { streetAddress: schema.address.streetAddress }),
      ...(schema.address.city && { addressLocality: schema.address.city }),
      ...(schema.address.postalCode && { postalCode: schema.address.postalCode }),
      ...(schema.address.country && { addressCountry: schema.address.country }),
    }
  }

  if (schema?.contactPhone || schema?.contactEmail) {
    orgSchema.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      ...(schema.contactPhone && { telephone: schema.contactPhone }),
      ...(schema.contactEmail && { email: schema.contactEmail }),
    }
  }

  // Profiles entered once under Social Media count as sameAs too; asking an
  // editor to type the same URLs into a second list is how they end up in
  // neither.
  const sameAs = [
    ...new Set([
      ...(schema?.sameAs ?? []).map((s) => s.url?.trim()).filter((u): u is string => Boolean(u)),
      ...socialProfileUrls(siteSettings as Parameters<typeof socialProfileUrls>[0]),
    ]),
  ]
  if (sameAs.length > 0) {
    orgSchema.sameAs = sameAs
  }

  return orgSchema
}

/**
 * Generate JSON-LD structured data for a webpage
 */
export function generateWebPageSchema({
  title,
  description,
  baseUrl,
  pathname,
  datePublished,
  dateModified,
}: {
  title: string
  description?: string | null
  baseUrl: string
  pathname?: string
  datePublished?: string | null
  dateModified?: string | null
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    ...(description && { description }),
    url: pathname ? `${baseUrl}${pathname}` : baseUrl,
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
  }
}

/**
 * Generate JSON-LD structured data for an article/blog post
 */
export function generateArticleSchema({
  title,
  description,
  baseUrl,
  pathname,
  image,
  datePublished,
  dateModified,
  authorName,
}: {
  title: string
  description?: string | null
  baseUrl: string
  pathname?: string
  image?: Media | string | null
  datePublished?: string | null
  dateModified?: string | null
  authorName?: string | null
}): object {
  const imageUrl = getMediaUrl(image, baseUrl)

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    ...(description && { description }),
    url: pathname ? `${baseUrl}${pathname}` : baseUrl,
    ...(imageUrl && { image: imageUrl }),
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
    ...(authorName && {
      author: {
        '@type': 'Person',
        name: authorName,
      },
    }),
  }
}

/**
 * Generate JSON-LD structured data for an event
 */
export function generateEventSchema({
  name,
  description,
  baseUrl,
  pathname,
  image,
  startDate,
  endDate,
  location,
  organizerName,
}: {
  name: string
  /** Plain text or CMS HTML; tags are stripped either way. */
  description?: string | null
  baseUrl: string
  pathname?: string
  image?: Media | string | null
  startDate?: string | null
  endDate?: string | null
  location?: string | null
  organizerName?: string | null
}): object {
  const imageUrl = getMediaUrl(image, baseUrl)
  const url = pathname ? `${baseUrl}${pathname}` : baseUrl
  const text = plainTextFrom(description, 500)
  const online = isOnlineLocation(location)

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    ...(text && { description: text }),
    url,
    ...(imageUrl && { image: imageUrl }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: online
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    // Google wants an address on a Place and a URL on a VirtualLocation. The
    // CMS has one free-text location field, so it doubles as the address; the
    // join link is not public, so the event page stands in for it.
    ...(online
      ? { location: { '@type': 'VirtualLocation', url } }
      : location
        ? { location: { '@type': 'Place', name: location, address: location } }
        : {}),
    ...(organizerName && {
      organizer: { '@type': 'Organization', name: organizerName, url: baseUrl },
    }),
  }
}

/** Whether a free-text event location describes an online meeting. */
export function isOnlineLocation(location?: string | null): boolean {
  if (!location) return false
  return /\b(zoom|teams|google meet|online|tiešsaist|nuotolin|veebis)/i.test(location)
}

/**
 * Generate JSON-LD structured data for FAQ page
 */
export function generateFAQSchema(
  faqs: Array<{ question?: string | null; answer?: string | null }>,
): object | null {
  const validFaqs = faqs.filter((faq) => faq.question && faq.answer)
  if (validFaqs.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: validFaqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}
