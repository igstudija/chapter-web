import { beforeEach, describe, expect, it } from 'vitest'
import { clearPartnerCache, readAllPartners } from '@/lib/chapterExchange/readPartners'
import type { ExchangeResponse } from '@/lib/chapterExchange/exchangeResponse'

const answer = (name: string, text: string): ExchangeResponse => ({
  version: 1,
  chapter: { name },
  requests: [
    {
      id: '1',
      request: text,
      registrationNumber: null,
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z',
      requester: {
        id: '7',
        name: 'Janis',
        surname: 'Berzins',
        email: null,
        company: null,
        phone: null,
        photoUrl: null,
        logoUrl: null,
      },
    },
  ],
})

const riga = { id: 1, name: 'Riga Chapter', theirKey: 'chx_x', paused: false }
const liepaja = { id: 2, name: 'Liepaja Chapter', theirKey: 'chx_y', paused: false }

describe('readAllPartners', () => {
  beforeEach(() => clearPartnerCache())

  it('reads every partner and keeps each one’s rows under its own name', async () => {
    const result = await readAllPartners({
      connections: [riga, liepaja],
      fetchOne: async (connection) => answer(connection.name, `from ${connection.name}`),
      now: () => 0,
    })

    expect(result.map((r) => r.chapterName).sort()).toEqual(['Liepaja Chapter', 'Riga Chapter'])
  })

  // The member-facing list says nothing about a partner that did not answer,
  // so the rest of the merge has to carry on around the hole (ADR 0007).
  it('leaves out a partner that could not be read, and keeps the others', async () => {
    const result = await readAllPartners({
      connections: [riga, liepaja],
      fetchOne: async (connection) =>
        connection.name === 'Riga Chapter' ? null : answer(connection.name, 'still here'),
      now: () => 0,
    })

    expect(result).toHaveLength(1)
    expect(result[0].chapterName).toBe('Liepaja Chapter')
  })

  it('does not call a paused partner', async () => {
    const called: string[] = []
    const result = await readAllPartners({
      connections: [{ ...riga, paused: true }],
      fetchOne: async (connection) => {
        called.push(connection.name)
        return answer(connection.name, 'x')
      },
      now: () => 0,
    })

    expect(called).toEqual([])
    expect(result).toEqual([])
  })

  it('serves a second read from the cache rather than calling again', async () => {
    let calls = 0
    const fetchOne = async (connection: { name: string }) => {
      calls += 1
      return answer(connection.name, 'cached')
    }

    await readAllPartners({ connections: [riga], fetchOne, now: () => 0 })
    await readAllPartners({ connections: [riga], fetchOne, now: () => 60_000 })

    expect(calls).toBe(1)
  })

  // A partner's bad minute must not become our quarter of an hour.
  it('does not cache a failure', async () => {
    let calls = 0
    const fetchOne = async (connection: { name: string }) => {
      calls += 1
      return calls === 1 ? null : answer(connection.name, 'back up')
    }

    const first = await readAllPartners({ connections: [riga], fetchOne, now: () => 0 })
    const second = await readAllPartners({ connections: [riga], fetchOne, now: () => 1 })

    expect(first).toEqual([])
    expect(second).toHaveLength(1)
    expect(calls).toBe(2)
  })

  it('calls again once the cached answer is old enough', async () => {
    let calls = 0
    const fetchOne = async (connection: { name: string }) => {
      calls += 1
      return answer(connection.name, 'fresh')
    }

    await readAllPartners({ connections: [riga], fetchOne, now: () => 0 })
    await readAllPartners({ connections: [riga], fetchOne, now: () => 15 * 60_000 + 1 })

    expect(calls).toBe(2)
  })

  // lastReachedAt is the only place a failing link is visible to anyone, since
  // the members list stays silent about it.
  it('reports which partners were reached, and only on a fresh read', async () => {
    const reached: (string | number)[] = []
    const fetchOne = async (connection: { name: string }) => answer(connection.name, 'x')

    await readAllPartners({ connections: [riga], fetchOne, now: () => 0, onReached: (id) => reached.push(id) })
    await readAllPartners({ connections: [riga], fetchOne, now: () => 1000, onReached: (id) => reached.push(id) })

    expect(reached).toEqual([1])
  })
})
