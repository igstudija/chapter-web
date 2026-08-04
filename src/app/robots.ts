import type { MetadataRoute } from 'next'

/**
 * What a crawler may read, and where the map is.
 *
 * The disallow list is not a security measure — everything under it already
 * requires a session, and a crawler that ignores this file gets a redirect to
 * the login either way. It is here so that crawl budget is spent on the pages
 * that should rank, and so a member's own profile or the admin panel never
 * turns up in a search result as a bare login redirect.
 */

export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '')
  const isPublicHost = Boolean(baseUrl) && !baseUrl!.includes('localhost')

  /*
   * A preview deployment and a laptop must not invite crawling: the same
   * content on a second address is a duplicate of the real site, and the copy
   * sometimes outranks it. Without a public base URL, nothing is allowed.
   */
  if (!isPublicHost) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api/',
          '/my-profile',
          '/members',
          '/success-stories',
          '/slides',
          '/login',
          '/forgot-password',
          '/reset-password',
          '/magic-link-verify',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
