import { getPayload } from 'payload'
import config from '@/payload.config'
import { cache } from 'react'
import type { Setting, SlideshowSettingsCollection } from '@/payload-types'

/**
 * The install's settings.
 *
 * There is one settings document, so these are plain singleton reads wrapped in
 * React `cache` — a request rendering many server components performs one query
 * rather than dozens.
 *
 * This module used to resolve the request's hostname to an organisation first
 * and then load that organisation's settings. `getSettings` is what is left of
 * `getCurrentSite` + `getSiteSettings` once there is only one organisation: the
 * fields that described the tenant (locale, timezone, the module switches) now
 * live on the settings document itself.
 */

const loadSingleton = async <T>(collection: 'settings' | 'slideshow-settings-collection') => {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection, limit: 1 })
  return (result.docs[0] as T | undefined) ?? null
}

/** Site-wide settings: branding, contact details, locale, module switches. */
export const getSettings = cache(async (): Promise<Setting | null> =>
  loadSingleton<Setting>('settings'),
)

/** Slideshow configuration for the presentation mode. */
export const getSlideshowSettings = cache(async (): Promise<SlideshowSettingsCollection | null> =>
  loadSingleton<SlideshowSettingsCollection>('slideshow-settings-collection'),
)
