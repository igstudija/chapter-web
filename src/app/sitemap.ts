import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import slugify from 'slugify'
import config from '@/payload.config'
import { getSettings } from '@/lib/getSiteSettings'

/**
 * Everything a search engine may read, in one file.
 *
 * This install is mostly detail pages — a post, an event, a company each on
 * their own URL — and none of them are linked from anywhere a crawler starts.
 * Without this they are found by luck or not at all, which is the difference
 * between a member's company page ranking for their own name and being
 * invisible.
 *
 * Only pages that answer to a signed-out visitor belong here. The members'
 * directory, success stories and the slideshow all redirect to the login, and
 * listing a URL that answers 307 teaches a crawler to distrust the file. That
 * boundary is checked by a test rather than kept in someone's head.
 */

export const dynamic = 'force-dynamic'

/** Pages that exist regardless of what is in the database. */
const STATIC_PATHS = [
  { path: '', priority: 1, changeFrequency: 'daily' as const },
  { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/companies', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/blog', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/events', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/contacts', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' as const },
  // Linked from every page's footer, so they are crawled anyway; listed at low
  // priority to say plainly that they are not what this site is for.
  { path: '/privacy-policy', priority: 0.2, changeFrequency: 'yearly' as const },
  { path: '/cookie-policy', priority: 0.2, changeFrequency: 'yearly' as const },
  { path: '/terms-and-conditions', priority: 0.2, changeFrequency: 'yearly' as const },
]

const companySlug = (company: string) => slugify(company, { lower: true, strict: true })

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings()

  /*
   * Absolute URLs are required, and `NEXT_PUBLIC_SERVER_URL` is the only value
   * that knows the public address — the request's own host is not available
   * here. Getting it wrong publishes a sitemap full of localhost, so a missing
   * one yields an empty file rather than a confidently wrong one.
   */
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '')
  if (!baseUrl || baseUrl.includes('localhost')) return []

  const payload = await getPayload({ config })

  const [posts, events, members] = await Promise.all([
    payload.find({ collection: 'blog', limit: 1000, depth: 0 }),
    payload.find({ collection: 'events', limit: 1000, depth: 0 }),
    payload.find({
      collection: 'members',
      where: { status: { equals: 'active' } },
      limit: 1000,
      depth: 0,
    }),
  ])

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map(
    ({ path, priority, changeFrequency }) => ({
      url: `${baseUrl}${path}`,
      lastModified: settings?.updatedAt ? new Date(settings.updatedAt) : new Date(),
      changeFrequency,
      priority,
    }),
  )

  for (const post of posts.docs) {
    if (!post.slug) continue
    entries.push({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: 'yearly',
      priority: 0.6,
    })
  }

  for (const event of events.docs) {
    if (!event.slug) continue
    entries.push({
      url: `${baseUrl}/events/${event.slug}`,
      lastModified: new Date(event.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  /*
   * A company page is keyed by a slug derived from the name rather than stored,
   * so two members at the same company would resolve to one URL. Deduplicated
   * here for the same reason the page itself picks the first match: one URL,
   * listed once.
   */
  const seen = new Set<string>()
  for (const member of members.docs) {
    if (!member.company) continue
    const slug = companySlug(member.company)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    entries.push({
      url: `${baseUrl}/companies/${slug}`,
      lastModified: new Date(member.updatedAt),
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  return entries
}
