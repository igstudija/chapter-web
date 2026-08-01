import { describe, expect, it } from 'vitest'
import { buildExchangeResponse } from '@/lib/chapterExchange/exchangeResponse'

const request = {
  id: 42,
  request: 'Looking for a logistics partner',
  registrationNumber: '40003000000',
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-02T10:00:00.000Z',
  sortOrder: -3,
  showOnSlide: true,
  requestedBy: { id: 7, name: 'Janis', surname: 'Berzins', email: 'janis@example.org' },
}

const memberships = {
  '7': {
    company: 'SIA Piemers',
    phone: '+37120000000',
    profileImage: { url: 'https://storage.example.org/media/janis.jpg' },
    logo: { url: 'https://storage.example.org/media/piemers.png' },
  },
}

const context = {
  chapterName: 'Riga Chapter',
  origin: 'https://riga.example.org',
  membershipByUserId: memberships,
}

describe('buildExchangeResponse', () => {
  it('names the chapter and the version it speaks', () => {
    const body = buildExchangeResponse([request], context)

    expect(body.version).toBe(1)
    expect(body.chapter.name).toBe('Riga Chapter')
  })

  it('joins the requester’s account and directory entry into one row', () => {
    const [row] = buildExchangeResponse([request], context).requests

    expect(row.request).toBe('Looking for a logistics partner')
    expect(row.registrationNumber).toBe('40003000000')
    expect(row.requester).toEqual({
      id: '7',
      name: 'Janis',
      surname: 'Berzins',
      email: 'janis@example.org',
      company: 'SIA Piemers',
      phone: '+37120000000',
      photoUrl: 'https://storage.example.org/media/janis.jpg',
      logoUrl: 'https://storage.example.org/media/piemers.png',
    })
  })

  // A partner renders these images straight from our storage, so a path that
  // only resolves against our own host would arrive broken (ADR 0007).
  it('makes a relative media URL absolute against this chapter', () => {
    const [row] = buildExchangeResponse(
      [{ ...request, requestedBy: { ...request.requestedBy, id: 8 } }],
      {
        ...context,
        membershipByUserId: { '8': { profileImage: { url: '/media/janis.jpg' } } },
      },
    ).requests

    expect(row.requester.photoUrl).toBe('https://riga.example.org/media/janis.jpg')
  })

  // sortOrder is this chapter's private arrangement of its own list and
  // showOnSlide drives our slideshow. Neither means anything elsewhere, and a
  // field that never leaves cannot leak.
  it('sends neither sortOrder nor showOnSlide', () => {
    const serialised = JSON.stringify(buildExchangeResponse([request], context))

    expect(serialised).not.toContain('sortOrder')
    expect(serialised).not.toContain('showOnSlide')
  })

  it('survives a requester with no directory entry and no photo', () => {
    const orphan = { ...request, requestedBy: { id: 99, name: 'Anna', surname: 'Ozola' } }
    const [row] = buildExchangeResponse([orphan], context).requests

    expect(row.requester.name).toBe('Anna')
    expect(row.requester.company).toBeNull()
    expect(row.requester.photoUrl).toBeNull()
  })

  // A request whose relationship was never expanded carries an id instead of a
  // person. There is nobody to contact, so there is nothing worth sending.
  it('drops a request whose requester was not resolved', () => {
    expect(buildExchangeResponse([{ ...request, requestedBy: 7 }], context).requests).toEqual([])
  })
})
