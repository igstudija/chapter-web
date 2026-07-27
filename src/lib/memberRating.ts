/**
 * How a member — and by extension a power group — is rated on the members page.
 *
 * The old rating was `(top40 + specialRequests) / memberCount`: an average of
 * raw row counts. That let a single member with a long Top 40 carry a group
 * where nobody else had filed anything, made the number incomparable between
 * groups of different sizes, and ignored Top 20 entirely.
 */

/**
 * What a member is expected to have on file. Special requests have no target —
 * having any at all is the bar.
 */
export const LIST_TARGETS = { top40: 40, top20: 20 } as const

export interface MemberCounts {
  top40Count: number
  top20Count: number
  specialRequestsCount: number
}

/**
 * A member's completion, 0–100. Each of the three lists carries equal weight:
 * a full Top 40 counts once, a full Top 20 counts once, and having any special
 * request counts once. Overshooting a target does not bank credit — sixty Top
 * 40 entries is still one list done, so a member cannot buy a perfect score
 * with one list while leaving the others empty.
 */
export function memberRating({
  top40Count,
  top20Count,
  specialRequestsCount,
}: MemberCounts): number {
  const top40 = Math.min(top40Count / LIST_TARGETS.top40, 1)
  const top20 = Math.min(top20Count / LIST_TARGETS.top20, 1)
  const requests = specialRequestsCount > 0 ? 1 : 0
  return ((top40 + top20 + requests) / 3) * 100
}

/** A group's rating is the mean of its members' completion. */
export function groupRating(members: ReadonlyArray<MemberCounts>): number {
  if (members.length === 0) return 0
  return members.reduce((sum, m) => sum + memberRating(m), 0) / members.length
}
