import type { Payload } from 'payload'
import { isSuperadminHost } from './constants'

/**
 * Host → organisation resolution. The single implementation.
 *
 * Four call sites need this: page rendering (`getSiteFromHost`), collection
 * access control (`access/multisite.ts`), the login route, and the Users
 * afterLogin hook. They used to each carry their own copy of the rules, which is
 * how they drifted; anything that changes tenant resolution belongs here.
 *
 * Resolution order for a non-superadmin host:
 *
 *   1. Exact `domain` match on an active site.
 *   2. If the install has exactly ONE active site, that site.
 *
 * Step 2 is what makes a single-organisation install — the common case — work
 * without configuration. It covers `localhost` in development, a bare IP, a
 * platform preview URL, and a custom domain the operator has not yet typed into
 * the Sites record. Because it only applies when there is precisely one active
 * site, it cannot pick the wrong tenant: the moment a second site is activated
 * the fallback stops firing and every host must match its own `domain`.
 *
 * A superadmin host resolves to no site, and an unmatched host on a multi-site
 * install returns null so callers render not-found rather than leaking another
 * organisation's content.
 */

/**
 * Minimal shape callers rely on.
 *
 * Deliberately not the generated `Site` type: this module is imported by access
 * control and by the login path, which run before/independently of type
 * generation, and callers only ever read `id` and `enableActivities`. Returning
 * the full document under a narrow contract keeps `payload-types` regeneration
 * from rippling through four call sites.
 */
interface ResolvedSite {
  id: string | number
  enableActivities?: boolean | null
}

export interface SiteResolution {
  site: ResolvedSite | null
  /** True when the host is a superadmin panel host (no site context by design). */
  isSuperadmin: boolean
}

export const resolveSiteFromHost = async (
  payload: Payload,
  host: string | null,
): Promise<SiteResolution> => {
  if (!host) return { site: null, isSuperadmin: false }

  const hostname = host.split(':')[0].toLowerCase()

  if (isSuperadminHost(hostname)) {
    return { site: null, isSuperadmin: true }
  }

  const byDomain = await payload.find({
    collection: 'sites',
    where: {
      domain: { equals: hostname },
      status: { equals: 'active' },
    },
    limit: 1,
  })

  if (byDomain.docs.length > 0) {
    return { site: byDomain.docs[0] as unknown as ResolvedSite, isSuperadmin: false }
  }

  // Single-organisation fallback. `limit: 2` is deliberate: it is the cheapest
  // way to distinguish "exactly one" from "more than one" in a single query.
  const active = await payload.find({
    collection: 'sites',
    where: { status: { equals: 'active' } },
    limit: 2,
  })

  if (active.docs.length === 1) {
    return { site: active.docs[0] as unknown as ResolvedSite, isSuperadmin: false }
  }

  return { site: null, isSuperadmin: false }
}
