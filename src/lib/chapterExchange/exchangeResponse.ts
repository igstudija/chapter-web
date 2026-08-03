/**
 * The body this chapter serves to a partner reading its special requests.
 *
 * This is a published contract with servers we do not control: fields may be
 * added, never removed, renamed, or given a new meaning. Readers on older
 * versions ignore what they do not know and treat what is missing as empty.
 * See ADR 0007.
 */

export const EXCHANGE_VERSION = 1

/** A special request as it comes out of Payload, with its requester resolved. */
export interface ExchangeSourceRequest {
  id: string | number
  request: string
  registrationNumber?: string | null
  createdAt: string
  updatedAt: string
  requestedBy?:
    | { id: string | number; name?: string | null; surname?: string | null; email?: string | null }
    | string
    | number
    | null
}

/** The directory entry behind a requester, keyed by their user id. */
export interface ExchangeSourceMembership {
  company?: string | null
  phone?: string | null
  profileImage?: { url?: string | null } | string | number | null
  logo?: { url?: string | null } | string | number | null
}

export interface ExchangeRequester {
  id: string
  name: string | null
  surname: string | null
  email: string | null
  company: string | null
  phone: string | null
  photoUrl: string | null
  logoUrl: string | null
}

export interface ExchangeRequest {
  id: string
  request: string
  registrationNumber: string | null
  createdAt: string
  updatedAt: string
  requester: ExchangeRequester
}

export interface ExchangeResponse {
  version: number
  chapter: { name: string }
  requests: ExchangeRequest[]
}

export interface ExchangeContext {
  /** What this chapter calls itself, as the partner will label our rows. */
  chapterName: string
  /** This install's origin, used to resolve media paths for a foreign reader. */
  origin: string
  membershipByUserId: Record<string, ExchangeSourceMembership>
}

/**
 * Media URLs are absolute in a Supabase install and relative in others. A
 * partner resolves them against *their* host, so anything relative has to be
 * made absolute against ours before it leaves.
 */
const absoluteMediaUrl = (
  media: ExchangeSourceMembership['profileImage'],
  origin: string,
): string | null => {
  if (!media || typeof media !== 'object' || !media.url) return null
  try {
    return new URL(media.url, origin).toString()
  } catch {
    return null
  }
}

/**
 * Build the response body.
 *
 * Which requests are eligible — open, and not marked chapter-only — is decided
 * by the query that fetches them, so that one rule lives in one place. This
 * shapes whatever it is given.
 */
export const buildExchangeResponse = (
  docs: ExchangeSourceRequest[],
  { chapterName, origin, membershipByUserId }: ExchangeContext,
): ExchangeResponse => {
  const requests: ExchangeRequest[] = []

  for (const doc of docs) {
    // An unresolved relationship leaves an id where the person should be.
    // Nobody can be contacted from that, so the row is worth nothing to a
    // partner.
    if (!doc.requestedBy || typeof doc.requestedBy !== 'object') continue

    const membership = membershipByUserId[String(doc.requestedBy.id)] ?? {}

    requests.push({
      id: String(doc.id),
      request: doc.request,
      registrationNumber: doc.registrationNumber ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      requester: {
        id: String(doc.requestedBy.id),
        name: doc.requestedBy.name ?? null,
        surname: doc.requestedBy.surname ?? null,
        email: doc.requestedBy.email ?? null,
        company: membership.company ?? null,
        phone: membership.phone ?? null,
        photoUrl: absoluteMediaUrl(membership.profileImage, origin),
        logoUrl: absoluteMediaUrl(membership.logo, origin),
      },
    })
  }

  return { version: EXCHANGE_VERSION, chapter: { name: chapterName }, requests }
}
