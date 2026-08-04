import type { PartnerRows } from './readPartners'

/**
 * Turning what partners sent into rows the members list already knows how to
 * render.
 *
 * The list groups by requester and paginates members, and none of that changes
 * for this feature (ADR 0007). Partner rows are reshaped to fit it rather than
 * the other way round.
 */

/** A row in the shape `SpecialRequestsGrid` consumes, plus where it came from. */
export interface ListRow {
  id: string
  request: string
  registrationNumber: string | null
  createdAt: string
  updatedAt: string
  requestedBy: { id: string; name: string; surname: string; email: string }
  /** Absent on our own rows; set on anything that arrived over a link. */
  chapterName?: string
}

export interface ListMembership {
  company: string | null
  phone: string | null
  profileImage: { url: string } | null
  logo: { url: string } | null
}

export interface MergedPartnerRows {
  requests: ListRow[]
  membershipByUserId: Record<string, ListMembership>
}

/**
 * Namespace an identifier by the chapter it came from.
 *
 * Every install numbers its people from one, so a partner's user 7 and our own
 * user 7 are different people who would otherwise be grouped into a single row
 * wearing whichever contact details arrived last. The prefix cannot collide
 * with a local id, which is always numeric.
 */
const scopedId = (chapterName: string, id: string | number): string => `${chapterName}#${id}`

export const partnerRowsForList = (partners: PartnerRows[]): MergedPartnerRows => {
  const requests: ListRow[] = []
  const membershipByUserId: Record<string, ListMembership> = {}

  for (const partner of partners) {
    for (const row of partner.requests) {
      const requesterId = scopedId(partner.chapterName, row.requester.id)

      requests.push({
        id: scopedId(partner.chapterName, row.id),
        request: row.request,
        registrationNumber: row.registrationNumber,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        requestedBy: {
          id: requesterId,
          name: row.requester.name ?? '',
          surname: row.requester.surname ?? '',
          email: row.requester.email ?? '',
        },
        chapterName: partner.chapterName,
      })

      membershipByUserId[requesterId] = {
        company: row.requester.company,
        phone: row.requester.phone,
        profileImage: row.requester.photoUrl ? { url: row.requester.photoUrl } : null,
        logo: row.requester.logoUrl ? { url: row.requester.logoUrl } : null,
      }
    }
  }

  return { requests, membershipByUserId }
}
