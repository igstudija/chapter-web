import type { Payload } from 'payload'
import { authenticatePartner } from './partnerAuth'
import {
  buildExchangeResponse,
  type ExchangeResponse,
  type ExchangeSourceMembership,
  type ExchangeSourceRequest,
} from './exchangeResponse'

/**
 * Serving a linked chapter, without the HTTP around it.
 *
 * Kept apart from the route so that it can be exercised against a real
 * database — which is where the two filters below have to be proven, not in a
 * stub that would agree with whatever they were written as.
 */

export interface ServeExchangeArgs {
  payload: Payload
  /** The incoming Authorization header, verbatim. */
  authorization: string | null | undefined
  /** This install's origin, for resolving media paths a partner will load. */
  origin: string
}

export interface ServeExchangeResult {
  status: number
  body: ExchangeResponse | null
  /** The connection that authenticated, so the caller can log or stamp it. */
  partnerId: string | number | null
}

export const serveExchange = async ({
  payload,
  authorization,
  origin,
}: ServeExchangeArgs): Promise<ServeExchangeResult> => {
  const connections = await payload.find({
    collection: 'chapter-connections',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  const partner = authenticatePartner(
    authorization,
    connections.docs.map((doc) => ({
      id: doc.id,
      name: doc.name,
      secret: doc.ourSecret ?? '',
      paused: doc.paused,
    })),
  )

  if (!partner) return { status: 401, body: null, partnerId: null }

  const [requests, members, settings] = await Promise.all([
    payload.find({
      collection: 'special-requests',
      where: {
        and: [
          { status: { equals: 'open' } },
          // Not `not_equals: true`. A row whose chapterOnly is NULL — written
          // before the field existed, or by anything that is not Payload —
          // compares as unknown in Postgres and would drop out of the shared
          // set without saying so. Absent means "not marked", which is shared.
          { or: [{ chapterOnly: { equals: false } }, { chapterOnly: { exists: false } }] },
        ],
      },
      limit: 1000,
      sort: '-createdAt',
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'members',
      where: { status: { equals: 'active' } },
      limit: 500,
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({ collection: 'settings', limit: 1, depth: 0, overrideAccess: true }),
  ])

  const membershipByUserId: Record<string, ExchangeSourceMembership> = {}
  for (const member of members.docs) {
    const userId = typeof member.user === 'object' ? member.user?.id : member.user
    if (userId) membershipByUserId[String(userId)] = member as ExchangeSourceMembership
  }

  return {
    status: 200,
    partnerId: partner.id,
    body: buildExchangeResponse(requests.docs as unknown as ExchangeSourceRequest[], {
      chapterName: settings.docs[0]?.siteName || 'Unnamed chapter',
      origin,
      membershipByUserId,
    }),
  }
}
