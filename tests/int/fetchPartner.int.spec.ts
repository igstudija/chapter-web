import { describe, expect, it } from 'vitest'
import { encodeConnectionKey } from '@/lib/chapterExchange/connectionKey'
import { fetchPartner } from '@/lib/chapterExchange/fetchPartner'

/**
 * Reading a partner that may be running anything, or nothing.
 *
 * The partner here is a fake: two real installs finding each other is not
 * proven anywhere, and ADR 0007 says so. What is proven is that every way the
 * far end can misbehave ends as null rather than as an exception on a page
 * members are trying to read.
 */
const theirKey = encodeConnectionKey({
  origin: 'https://riga.example.org',
  secret: 'their-secret',
  name: 'Riga Chapter',
})

const connection = { name: 'Riga Chapter', theirKey }

const body = {
  version: 1,
  chapter: { name: 'Riga Chapter' },
  requests: [
    {
      id: '1',
      request: 'Looking for a logistics partner',
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z',
      requester: { id: '7', name: 'Janis', surname: 'Berzins', email: 'janis@example.org' },
    },
  ],
}

const respondWith = (payload: unknown, init: ResponseInit = {}) =>
  (async () => new Response(JSON.stringify(payload), { status: 200, ...init })) as typeof fetch

describe('fetchPartner', () => {
  it('reads a partner that answers', async () => {
    const result = await fetchPartner(connection, { fetch: respondWith(body) })

    expect(result?.requests).toHaveLength(1)
    expect(result?.requests[0].requester.name).toBe('Janis')
  })

  it('presents the secret from their key, at their origin', async () => {
    let seen: { url: string; authorization: string | null } | null = null
    const spy = (async (input: RequestInfo | URL, init?: RequestInit) => {
      seen = {
        url: String(input),
        authorization: new Headers(init?.headers).get('authorization'),
      }
      return new Response(JSON.stringify(body), { status: 200 })
    }) as typeof fetch

    await fetchPartner(connection, { fetch: spy })

    expect(seen!.url).toBe('https://riga.example.org/api/special-request-exchange/v1')
    expect(seen!.authorization).toBe('Bearer their-secret')
  })

  // A partner we have not been given a key for is one we share with but do not
  // read. That is a supported shape, not a failure (ADR 0007).
  it('does not call a partner we hold no key for', async () => {
    let called = false
    const spy = (async () => {
      called = true
      return new Response('{}', { status: 200 })
    }) as typeof fetch

    expect(await fetchPartner({ name: 'Riga', theirKey: null }, { fetch: spy })).toBeNull()
    expect(called).toBe(false)
  })

  it.each([
    ['a server error', respondWith(body, { status: 500 })],
    ['a 401, meaning they revoked us', respondWith(body, { status: 401 })],
    ['a body that is not JSON', (async () => new Response('<html>oops</html>')) as typeof fetch],
    ['a body with no requests array', respondWith({ version: 1, chapter: { name: 'Riga' } })],
    ['a body that is not an object', respondWith(['nope'])],
    [
      'a connection that never opens',
      (async () => {
        throw new TypeError('fetch failed')
      }) as typeof fetch,
    ],
  ])('gives up quietly on %s', async (_case, fakeFetch) => {
    expect(await fetchPartner(connection, { fetch: fakeFetch })).toBeNull()
  })

  it('gives up on a partner that never answers', async () => {
    const hangs = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })) as typeof fetch

    expect(await fetchPartner(connection, { fetch: hangs, timeoutMs: 20 })).toBeNull()
  })

  // Installs upgrade at their own pace. A newer partner is still readable: what
  // we know is read, what we do not is ignored.
  it('reads a partner speaking a later version, ignoring what it does not know', async () => {
    const later = {
      ...body,
      version: 7,
      requests: [{ ...body.requests[0], mood: 'urgent', requester: { id: '7', name: 'Janis' } }],
    }

    const result = await fetchPartner(connection, { fetch: respondWith(later) })

    expect(result?.requests[0].requester.name).toBe('Janis')
    expect(result?.requests[0].requester.email).toBeNull()
  })
})
