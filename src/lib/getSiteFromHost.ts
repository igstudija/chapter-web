import { getPayload } from 'payload'
import config from '@/payload.config'
import { cache } from 'react'
import type { Site } from '@/payload-types'
import { SUPERADMIN_HOSTS, isSuperadminHost } from './constants'
import { resolveSiteFromHost } from './resolveSite'

/**
 * Site resolution for rendering, cached per request.
 *
 * The rules live in `resolveSite.ts` — see that file for how a hostname maps to
 * an organisation. This wrapper only adds the React `cache` so a single request
 * rendering many server components performs one lookup rather than dozens.
 */

export const getSiteFromHost = cache(async (host: string | null): Promise<Site | null> => {
  const payload = await getPayload({ config })
  const { site } = await resolveSiteFromHost(payload, host)
  return (site as Site | null) ?? null
})

// Get site ID for queries
export const getCurrentSiteId = cache(
  async (host: string | null): Promise<string | number | null> => {
    const site = await getSiteFromHost(host)
    return site?.id ?? null
  },
)

// Re-export for backwards compatibility
export { isSuperadminHost, SUPERADMIN_HOSTS }
