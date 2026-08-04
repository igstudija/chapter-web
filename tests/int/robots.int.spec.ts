import { describe, expect, it, afterEach } from 'vitest'
import robots from '@/app/robots'

const ORIGINAL = process.env.NEXT_PUBLIC_SERVER_URL
afterEach(() => {
  process.env.NEXT_PUBLIC_SERVER_URL = ORIGINAL
})

/** The paths that answer only to a signed-in member, or to nobody. */
const PRIVATE_PATHS = [
  '/admin',
  '/api/',
  '/my-profile',
  '/members',
  '/success-stories',
  '/slides',
]

describe('robots.txt', () => {
  it('keeps a laptop and a preview deploy out of the index', () => {
    // The same content on a second address is a duplicate of the real site,
    // and the copy sometimes outranks it.
    process.env.NEXT_PUBLIC_SERVER_URL = 'http://localhost:3050'

    const rules = robots().rules

    expect(rules).toEqual([{ userAgent: '*', disallow: '/' }])
    expect(robots().sitemap).toBeUndefined()
  })

  it('refuses to invite crawling when it does not know its own address', () => {
    delete process.env.NEXT_PUBLIC_SERVER_URL

    expect(robots().rules).toEqual([{ userAgent: '*', disallow: '/' }])
  })

  it('points at the sitemap on a real host', () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://example.org'

    expect(robots().sitemap).toBe('https://example.org/sitemap.xml')
  })

  it('tolerates a trailing slash on the configured URL', () => {
    // Otherwise the sitemap line reads `https://example.org//sitemap.xml`.
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://example.org/'

    expect(robots().sitemap).toBe('https://example.org/sitemap.xml')
  })

  it.each(PRIVATE_PATHS)('keeps crawl budget off %s', (path) => {
    // Not a security measure — these already require a session. It stops a
    // member's own profile turning up in a search result as a login redirect.
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://example.org'

    const rule = robots().rules
    const disallow = Array.isArray(rule) ? rule[0].disallow : rule.disallow

    expect(disallow).toContain(path)
  })
})
