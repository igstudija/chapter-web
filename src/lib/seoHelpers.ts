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
  const pageTitle =
    seo?.metaTitle || contentTitle || siteSeo?.defaultTitle || siteBranding?.siteName || DEFAULT_ORG_NAME
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
      siteName: siteSeo?.ogSiteName || siteBranding?.siteName || undefined,
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
  if (!schema?.organizationName && !siteBranding?.siteName) return null

  const logoUrl = getMediaUrl(schema?.organizationLogo, baseUrl) || getMediaUrl(siteBranding?.siteLogo, baseUrl)

  const orgSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schema?.organizationType || 'Organization',
    name: schema?.organizationName || siteBranding?.siteName,
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

  if (schema?.sameAs && schema.sameAs.length > 0) {
    orgSchema.sameAs = schema.sameAs.filter((s) => s.url).map((s) => s.url)
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
}: {
  name: string
  description?: string | null
  baseUrl: string
  pathname?: string
  image?: Media | string | null
  startDate?: string | null
  endDate?: string | null
  location?: string | null
}): object {
  const imageUrl = getMediaUrl(image, baseUrl)

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    ...(description && { description }),
    url: pathname ? `${baseUrl}${pathname}` : baseUrl,
    ...(imageUrl && { image: imageUrl }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(location && {
      location: {
        '@type': 'Place',
        name: location,
      },
    }),
  }
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
