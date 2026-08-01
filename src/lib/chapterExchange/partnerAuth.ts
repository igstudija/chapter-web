import { timingSafeEqual } from 'node:crypto'

/**
 * Authenticating a partner reading this chapter's special requests.
 *
 * The secret on a connection record is the one this install minted and handed
 * over, so an incoming call is matched against our own records rather than
 * verified cryptographically. See ADR 0007.
 */

/** The part of a connection record this needs; the collection carries more. */
export interface PartnerConnection {
  id: string | number
  name: string
  /** The secret we minted for this partner and put in the key we gave them. */
  secret: string
  paused?: boolean | null
}

const BEARER = 'Bearer '

/**
 * Compare without leaking, through timing, how much of the secret was right.
 *
 * `timingSafeEqual` throws on a length mismatch, which would itself be a
 * disclosure, so unequal lengths are compared as a fixed-length failure rather
 * than short-circuited.
 */
const secretsMatch = (presented: string, stored: string): boolean => {
  const a = Buffer.from(presented, 'utf8')
  const b = Buffer.from(stored, 'utf8')
  if (a.length !== b.length) {
    timingSafeEqual(b, b)
    return false
  }
  return timingSafeEqual(a, b)
}

/**
 * The connection that presented this Authorization header, or null.
 *
 * Every connection is compared even after a match is found, so that a partner
 * near the start of the list cannot be told apart from one near the end.
 */
export const authenticatePartner = (
  authorization: string | null | undefined,
  connections: PartnerConnection[],
): PartnerConnection | null => {
  if (!authorization || !authorization.startsWith(BEARER)) return null

  const presented = authorization.slice(BEARER.length)
  if (!presented) return null

  let matched: PartnerConnection | null = null
  for (const connection of connections) {
    // Paused connections are compared like any other and discarded afterwards.
    // Skipping them would make a paused partner measurably faster to reject
    // than an unknown one.
    if (secretsMatch(presented, connection.secret) && !connection.paused) matched = connection
  }

  return matched
}
