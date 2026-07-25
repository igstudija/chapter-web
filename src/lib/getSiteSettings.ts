import { getPayload } from 'payload'
import config from '@/payload.config'
import { cache } from 'react'
import { headers } from 'next/headers'
import type { Site, SiteSettingsCollection, SlideshowSettingsCollection } from '@/payload-types'
import { getSiteFromHost } from './getSiteFromHost'

/**
 * Get the current site (based on hostname)
 * Returns the Site object which includes enableActivities and other site-level settings
 */
export const getCurrentSite = cache(async (): Promise<Site | null> => {
  const headersList = await headers()
  const host = headersList.get('host')
  return getSiteFromHost(host)
})

/**
 * Get site settings for the current site (based on hostname)
 * Falls back to null if no settings exist for the site
 */
export const getSiteSettings = cache(async (): Promise<SiteSettingsCollection | null> => {
  const headersList = await headers()
  const host = headersList.get('host')
  const currentSite = await getSiteFromHost(host)

  if (!currentSite) return null

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'site-settings-collection',
    where: {
      site: { equals: currentSite.id },
    },
    limit: 1,
  })

  return result.docs.length > 0 ? result.docs[0] : null
})

/**
 * Get site settings by site ID
 */
export const getSiteSettingsById = cache(
  async (siteId: string): Promise<SiteSettingsCollection | null> => {
    const payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'site-settings-collection',
      where: {
        site: { equals: siteId },
      },
      limit: 1,
    })

    return result.docs.length > 0 ? result.docs[0] : null
  },
)

/**
 * Get slideshow settings for the current site (based on hostname)
 * Falls back to null if no settings exist for the site
 */
export const getSlideshowSettings = cache(async (): Promise<SlideshowSettingsCollection | null> => {
  const headersList = await headers()
  const host = headersList.get('host')
  const currentSite = await getSiteFromHost(host)

  if (!currentSite) return null

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'slideshow-settings-collection',
    where: {
      site: { equals: currentSite.id },
    },
    limit: 1,
    depth: 2,
  })

  return result.docs.length > 0 ? result.docs[0] : null
})

/**
 * Get slideshow settings by site ID
 */
export const getSlideshowSettingsById = cache(
  async (siteId: string): Promise<SlideshowSettingsCollection | null> => {
    const payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'slideshow-settings-collection',
      where: {
        site: { equals: siteId },
      },
      limit: 1,
    })

    return result.docs.length > 0 ? result.docs[0] : null
  },
)
