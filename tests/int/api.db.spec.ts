import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

/**
 * What a completed install looks like from the database side.
 *
 * These run against a migrated and bootstrapped database. In CI that is the
 * install-path job, working on a Postgres that was empty minutes earlier —
 * which is the whole point, since nothing else ever exercises that path.
 */

let payload: Payload

/**
 * The records the pages read their headings and copy from. Absent, the site
 * still starts and its first screen renders half-built, which is the failure
 * this list exists to catch.
 */
const PAGE_CONFIGURATION = [
  'homepage-settings',
  'about-us-settings',
  'faq-settings',
  'companies-page-settings',
  'contacts-page-settings',
  'listing-pages-seo',
  'slideshow-settings-collection',
] as const

describe('an installed database', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  it('answers queries', async () => {
    const users = await payload.find({ collection: 'users' })
    expect(users).toBeDefined()
  })

  it('has an administrator who can reach the admin panel', async () => {
    const admins = await payload.find({
      collection: 'users',
      where: { role: { equals: 'member-admin' } },
      limit: 1,
    })

    expect(admins.docs.length).toBeGreaterThan(0)
  })

  it('has settings carrying the organisation name', async () => {
    const settings = await payload.find({ collection: 'settings', limit: 1 })

    expect(settings.docs[0]?.siteName).toBeTruthy()
  })

  it.each(PAGE_CONFIGURATION)('has a %s record', async (collection) => {
    const found = await payload.find({ collection, limit: 1 })

    expect(found.docs.length).toBe(1)
  })
})
