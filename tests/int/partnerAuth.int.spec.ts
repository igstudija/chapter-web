import { describe, expect, it } from 'vitest'
import { authenticatePartner } from '@/lib/chapterExchange/partnerAuth'

/**
 * The secret on a connection is the one *we* minted and handed to that partner,
 * so authenticating an incoming call is a lookup across our own records.
 *
 * Nothing here proves the comparison is constant-time — no test can. That
 * property lives in the implementation and is a review concern (ADR 0007).
 */
const connections = [
  { id: 1, name: 'Riga Chapter', ourSecret: 'riga-secret', paused: false },
  { id: 2, name: 'Liepaja Chapter', ourSecret: 'liepaja-secret', paused: false },
  { id: 3, name: 'Ventspils Chapter', ourSecret: 'ventspils-secret', paused: true },
]

describe('authenticatePartner', () => {
  it('finds the connection whose secret was presented', () => {
    expect(authenticatePartner('Bearer liepaja-secret', connections)?.name).toBe('Liepaja Chapter')
  })

  it.each([
    ['no header at all', null],
    ['an empty header', ''],
    ['a secret nobody holds', 'Bearer not-a-secret'],
    ['a secret with no scheme', 'riga-secret'],
    ['the wrong scheme', 'Basic riga-secret'],
    ['an empty bearer', 'Bearer '],
  ])('turns away %s', (_case, header) => {
    expect(authenticatePartner(header, connections)).toBeNull()
  })

  // Pausing exists so that "stop this for a week" does not cost a fresh
  // handshake between two people. It has to actually stop serving.
  it('turns away a paused connection holding a valid secret', () => {
    expect(authenticatePartner('Bearer ventspils-secret', connections)).toBeNull()
  })

  // A secret that is a prefix of a real one, or the whole thing plus a
  // character, must not slip through a length-tolerant comparison.
  it.each([
    ['a prefix of a real secret', 'Bearer riga-secre'],
    ['a real secret with something appended', 'Bearer riga-secretx'],
  ])('turns away %s', (_case, header) => {
    expect(authenticatePartner(header, connections)).toBeNull()
  })
})
