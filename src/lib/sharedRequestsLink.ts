import crypto from 'crypto'

/**
 * Shared (brand-free) special-requests link.
 *
 * The token is derived, not stored: HMAC(PAYLOAD_SECRET, weekIndex). That means
 * it rotates on its own every Monday 00:00 UTC and last week's link stops working
 * without any cron job, DB write or cleanup. The admin view just recomputes the
 * current token, so what it shows is always the link that currently works.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
// 1970-01-01 was a Thursday. Shifting the epoch by 3 days puts every period
// boundary on a Monday 00:00 UTC.
const MONDAY_ALIGN_MS = 3 * 24 * 60 * 60 * 1000

export const SHARED_REQUESTS_TOKEN_LENGTH = 32

/** Anything that could be a token in the URL, so we 404 (not redirect) on junk paths. */
export const SHARED_REQUESTS_TOKEN_PATTERN = /^[0-9a-f]{32}$/

function getWeekIndex(now: number): number {
  return Math.floor((now + MONDAY_ALIGN_MS) / WEEK_MS)
}

function tokenForWeek(weekIndex: number): string {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    throw new Error('PAYLOAD_SECRET is required to derive the shared special-requests token')
  }

  return crypto
    .createHmac('sha256', secret)
    .update(`special-requests-link:${weekIndex}`)
    .digest('hex')
    .slice(0, SHARED_REQUESTS_TOKEN_LENGTH)
}

/** The token that is valid right now. Changes every Monday. */
export function getCurrentSharedRequestsToken(now: number = Date.now()): string {
  return tokenForWeek(getWeekIndex(now))
}

/** When the current token stops working (= start of next week, Monday 00:00 UTC). */
export function getSharedRequestsTokenExpiry(now: number = Date.now()): Date {
  return new Date((getWeekIndex(now) + 1) * WEEK_MS - MONDAY_ALIGN_MS)
}

export function isValidSharedRequestsToken(token: string, now: number = Date.now()): boolean {
  if (!SHARED_REQUESTS_TOKEN_PATTERN.test(token)) return false

  const expected = getCurrentSharedRequestsToken(now)
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false

  return crypto.timingSafeEqual(a, b)
}
