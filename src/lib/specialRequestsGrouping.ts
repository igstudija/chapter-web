/**
 * Grouping logic shared by the chapter special-requests list and the brand-free
 * shared list, so both collapse a member's requests to a single row the same way.
 */

export interface GroupableRequester {
  id: string | number
  name: string
  surname: string
  email?: string | null
}

export interface GroupableRequest {
  id: string | number
  request: string
  registrationNumber?: string | null
  createdAt: string
  updatedAt: string
  showOnSlide?: boolean | null
  requestedBy?: GroupableRequester | string | number | null
  /** Absent on our own rows; set on anything that arrived from a linked chapter. */
  chapterName?: string
}

export interface MemberEntry<T extends GroupableRequest = GroupableRequest> {
  memberId: string
  /** The row's headline request: the starred one if the member has one, else the newest. */
  displayRequest: T
  /** Every request this member has, starred first then newest first — what the expanded row shows. */
  requests: T[]
  totalCount: number
  lastActivity: string
}

export function getRequesterId(request: GroupableRequest): string | null {
  if (request.requestedBy && typeof request.requestedBy === 'object') {
    return String(request.requestedBy.id)
  }
  if (typeof request.requestedBy === 'string' || typeof request.requestedBy === 'number') {
    return String(request.requestedBy)
  }
  return null
}

export function getRequester(request: GroupableRequest): GroupableRequester | null {
  return request.requestedBy && typeof request.requestedBy === 'object' ? request.requestedBy : null
}

function groupByMember<T extends GroupableRequest>(requests: T[]): Map<string, T[]> {
  const byMember = new Map<string, T[]>()
  for (const request of requests) {
    const memberId = getRequesterId(request)
    if (!memberId) continue
    const list = byMember.get(memberId)
    if (list) list.push(request)
    else byMember.set(memberId, [request])
  }
  return byMember
}

/** Starred request first, then newest first. */
function sortForDisplay<T extends GroupableRequest>(requests: T[]): T[] {
  return [...requests].sort((a, b) => {
    if (Boolean(a.showOnSlide) !== Boolean(b.showOnSlide)) return a.showOnSlide ? -1 : 1
    return b.createdAt.localeCompare(a.createdAt)
  })
}

/**
 * One entry per member, most recently active member first.
 *
 * `filtered` drives which members appear (so search narrows the list), while
 * `all` drives the count and the expanded contents — a member matched by their
 * name still expands to every request they have, not just the matching ones.
 */
export function buildMemberEntries<T extends GroupableRequest>(
  filtered: T[],
  all: T[] = filtered,
): MemberEntry<T>[] {
  const allByMember = groupByMember(all)
  const entries: MemberEntry<T>[] = []

  for (const memberId of groupByMember(filtered).keys()) {
    const memberRequests = sortForDisplay(allByMember.get(memberId) ?? [])
    if (memberRequests.length === 0) continue

    const lastActivity = memberRequests.reduce((latest, request) => {
      const activity = request.updatedAt || request.createdAt
      return activity > latest ? activity : latest
    }, '')

    entries.push({
      memberId,
      displayRequest: memberRequests[0],
      requests: memberRequests,
      totalCount: memberRequests.length,
      lastActivity,
    })
  }

  entries.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity))
  return entries
}

export function requestCountLabel(
  count: number,
  locale: string,
  singular: string,
  plural: string,
): string {
  if (locale === 'lv') {
    return count % 10 === 1 && count % 100 !== 11 ? singular : plural
  }
  return count === 1 ? singular : plural
}
