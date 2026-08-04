import { getPayload } from 'payload'
import config from '@/payload.config'
import { cache } from 'react'
import { cachedRead } from './contentCache'
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

const loadSingleton = async <T>(collection: SingletonCollection) => {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection, limit: 1 })
  return (result.docs[0] as T | undefined) ?? null
}

type SingletonCollection = 'settings' | 'slideshow-settings-collection'

/**
 * Two layers, doing different jobs.
 *
 * React `cache` dedupes within one render: a page whose header, footer and body
 * all want the settings asks once. `cachedRead` spans requests, so the second
 * visitor does not repeat the first visitor's query at all — and it is dropped
 * the moment an editor saves, by the hook on the collection itself. Neither
 * layer can serve something stale; the settings are the same for every reader,
 * which is what makes them safe to share.
 */
const cachedSingleton = <T>(collection: SingletonCollection) =>
  cache(cachedRead(() => loadSingleton<T>(collection), ['singleton', collection], [collection]))

/** Site-wide settings: branding, contact details, locale, module switches. */
export const getSettings = cachedSingleton<Setting>('settings')

/** Slideshow configuration for the presentation mode. */
export const getSlideshowSettings = cachedSingleton<SlideshowSettingsCollection>(
  'slideshow-settings-collection',
)
