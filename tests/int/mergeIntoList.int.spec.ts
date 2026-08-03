import { describe, expect, it } from 'vitest'
import { partnerRowsForList } from '@/lib/chapterExchange/mergeIntoList'
import type { PartnerRows } from '@/lib/chapterExchange/readPartners'

const row = (id: string, requesterId: string, text: string) => ({
  id,
  request: text,
  registrationNumber: null,
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
  requester: {
    id: requesterId,
    name: 'Janis',
    surname: 'Berzins',
    email: 'janis@riga.example.org',
    company: 'SIA Piemers',
    phone: '+37120000000',
    photoUrl: 'https://riga.example.org/media/janis.jpg',
    logoUrl: null,
  },
})

const partners: PartnerRows[] = [
  { chapterName: 'Riga Chapter', requests: [row('1', '7', 'logistics')] },
  { chapterName: 'Liepaja Chapter', requests: [row('1', '7', 'accounting')] },
]

describe('partnerRowsForList', () => {
  it('labels every row with the chapter it came from', () => {
    const { requests } = partnerRowsForList(partners)

    expect(requests.map((r) => r.chapterName).sort()).toEqual(['Liepaja Chapter', 'Riga Chapter'])
  })

  // Grouping is by requester id, and two chapters number their people from one.
  // Left alone, a stranger in Riga and a stranger in Liepaja would collapse
  // into a single row wearing whichever contact details arrived last.
  it('keeps two chapters’ people apart when their ids collide', () => {
    const { requests, membershipByUserId } = partnerRowsForList(partners)

    const ids = requests.map((r) => r.requestedBy.id)
    expect(new Set(ids).size).toBe(2)
    expect(Object.keys(membershipByUserId)).toHaveLength(2)
  })

  it('never collides with a local member holding the same id', () => {
    const { requests } = partnerRowsForList(partners)

    expect(requests.map((r) => String(r.requestedBy.id))).not.toContain('7')
  })

  it('carries the contact details that make a request worth reading', () => {
    const { requests, membershipByUserId } = partnerRowsForList([partners[0]])
    const membership = membershipByUserId[String(requests[0].requestedBy.id)]

    expect(membership.company).toBe('SIA Piemers')
    expect(membership.phone).toBe('+37120000000')
    expect(membership.profileImage).toEqual({ url: 'https://riga.example.org/media/janis.jpg' })
  })

  it('leaves a row with no photo without one, rather than with an empty image', () => {
    const { requests, membershipByUserId } = partnerRowsForList([
      { chapterName: 'Riga Chapter', requests: [{ ...row('1', '7', 'x'), requester: { ...row('1', '7', 'x').requester, photoUrl: null } }] },
    ])

    expect(membershipByUserId[String(requests[0].requestedBy.id)].profileImage).toBeNull()
  })
})
