import { fetchPartner } from './fetchPartner'
import type { ExchangeRequest, ExchangeResponse } from './exchangeResponse'
import type { ChapterConnection } from './connection'

/**
 * Reading every linked chapter for one page render.
 *
 * Partners are read live rather than copied into our database: revoking a link
 * or deleting a request removes it from the other chapter within one cache
 * window, with nothing to clean up afterwards. The cache is still storage, and
 * the deployment docs say so rather than claiming we keep nothing (ADR 0007).
 */

/** How long a successful answer is reused. Failures are never held. */
export const PARTNER_CACHE_MS = 15 * 60 * 1000

export interface PartnerRows {
  chapterName: string
  requests: ExchangeRequest[]
}

export interface ReadAllPartnersArgs {
  connections: ChapterConnection[]
  /** Injectable so the reading side can be exercised against a fake partner. */
  fetchOne?: (connection: ChapterConnection) => Promise<ExchangeResponse | null>
  now?: () => number
  /** Awaited for each partner actually reached, not for cache hits. */
  onReached?: (id: string | number) => void | Promise<void>
}

interface CacheEntry {
  at: number
  value: ExchangeResponse
}

/**
 * Held in the process rather than in a shared store.
 *
 * On Fluid Compute an instance serves many requests, so this spares a partner
 * most of the load without adding infrastructure. A cold instance simply reads
 * again, which is the correct behaviour rather than a miss to be engineered
 * away.
 */
const cache = new Map<string, CacheEntry>()

/**
 * Empty the cache.
 *
 * A test seam. It cannot serve as invalidation on connection edits: the cache
 * lives in one process and the admin write usually happens in another, so a
 * change reaches the readers when the entry expires, not when it is saved.
 */
export const clearPartnerCache = (): void => cache.clear()

export const readAllPartners = async ({
  connections,
  fetchOne = (connection) => fetchPartner(connection),
  now = Date.now,
  onReached,
}: ReadAllPartnersArgs): Promise<PartnerRows[]> => {
  const active = connections.filter((connection) => !connection.paused && connection.theirKey)

  const answers = await Promise.all(
    active.map(async (connection): Promise<PartnerRows | null> => {
      const key = String(connection.id)
      const cached = cache.get(key)
      if (cached && now() - cached.at < PARTNER_CACHE_MS) {
        return { chapterName: connection.name, requests: cached.value.requests }
      }

      const answer = await fetchOne(connection)

      // Only a success is kept. A partner's bad minute must not become our
      // quarter of an hour.
      if (!answer) return null

      cache.set(key, { at: now(), value: answer })
      // Awaited, not fired off: a render can end before a floating promise
      // lands, and this is the only signal a failing link ever produces.
      await onReached?.(connection.id)
      return { chapterName: connection.name, requests: answer.requests }
    }),
  )

  return answers.filter((rows): rows is PartnerRows => rows !== null)
}
