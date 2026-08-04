import { getPayload, type Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import config from '@/payload.config'
import { serveExchange } from '@/lib/chapterExchange/serveExchange'
import { decodeConnectionKey } from '@/lib/chapterExchange/connectionKey'

/**
 * What a linked chapter can and cannot read from this install.
 *
 * These write fixtures, so they only run where the database is disposable —
 * the Postgres CI brings up on localhost (ADR 0003). Pointed at anything else,
 * including a Supabase project, they skip rather than leave records behind.
 */
const databaseHost = (() => {
  try {
    return new URL(process.env.POSTGRESS_DATABASE_URL || '').hostname
  } catch {
    return ''
  }
})()

const disposable = databaseHost === 'localhost' || databaseHost === '127.0.0.1'
const describeOnDisposable = disposable ? describe : describe.skip

describeOnDisposable('serving a linked chapter', () => {
  let payload: Payload
  let secret: string
  let connectionId: string | number
  let pausedConnectionId: string | number
  const requestIds: (string | number)[] = []

  const create = async (data: Record<string, unknown>, requestedBy: string | number) => {
    const doc = await payload.create({
      collection: 'special-requests',
      data: { requestedBy, ...data } as never,
      overrideAccess: true,
    })
    requestIds.push(doc.id)
    return doc
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    const users = await payload.find({ collection: 'users', limit: 1, overrideAccess: true })
    const requester = users.docs[0]?.id
    if (!requester) throw new Error('no user to hang fixtures off')

    const connection = await payload.create({
      collection: 'chapter-connections',
      data: { name: 'Test Partner' },
      overrideAccess: true,
    })
    connectionId = connection.id
    secret = connection.ourSecret as string

    const paused = await payload.create({
      collection: 'chapter-connections',
      data: { name: 'Paused Partner', paused: true },
      overrideAccess: true,
    })
    pausedConnectionId = paused.id

    await create({ request: 'shared and open', status: 'open', chapterOnly: false }, requester)
    await create({ request: 'kept at home', status: 'open', chapterOnly: true }, requester)
    await create({ request: 'already fulfilled', status: 'fulfilled', chapterOnly: false }, requester)

    // A row that predates the field. Payload cannot write NULL here, and this
    // is the case the query's `exists: false` clause exists for.
    const unmarked = await create({ request: 'never marked', status: 'open' }, requester)
    await payload.db.drizzle.execute(
      sql`UPDATE special_requests SET chapter_only = NULL WHERE id = ${unmarked.id}`,
    )
  })

  afterAll(async () => {
    for (const id of requestIds) {
      await payload.delete({ collection: 'special-requests', id, overrideAccess: true })
    }
    for (const id of [connectionId, pausedConnectionId]) {
      if (id) await payload.delete({ collection: 'chapter-connections', id, overrideAccess: true })
    }
  })

  const serve = (authorization: string | null) =>
    serveExchange({ payload, authorization, origin: 'https://ours.example.org' })

  // The codec and the reader were both tested, and neither noticed that nothing
  // ever called the codec: the admin generated a bare secret, which the other
  // chapter's field then refused as "not a connection key". The handshake was
  // impossible while every unit passed. This is the wiring, tested.
  it('hands out a key the other chapter can actually paste', async () => {
    const connection = await payload.findByID({
      collection: 'chapter-connections',
      id: connectionId,
      overrideAccess: true,
    })

    const decoded = decodeConnectionKey(connection.ourKey ?? '')

    expect(decoded).not.toBeNull()
    expect(decoded!.secret).toBe(secret)
    expect(decoded!.origin).toBe(process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/+$/, ''))
    expect(decoded!.name).toBeTruthy()
  })

  it('serves a partner holding a valid key', async () => {
    const { status, body } = await serve(`Bearer ${secret}`)

    expect(status).toBe(200)
    expect(body?.version).toBe(1)
    expect(body?.chapter.name).toBeTruthy()
  })

  it.each([
    ['no header', null],
    ['a secret nobody holds', 'Bearer wrong-secret'],
  ])('turns away %s with an empty 401', async (_case, header) => {
    const { status, body } = await serve(header)

    expect(status).toBe(401)
    expect(body).toBeNull()
  })

  it('turns away a paused partner', async () => {
    const paused = await payload.findByID({
      collection: 'chapter-connections',
      id: pausedConnectionId,
      overrideAccess: true,
    })

    expect((await serve(`Bearer ${paused.ourSecret}`)).status).toBe(401)
  })

  it('sends the requests that are open and not kept at home', async () => {
    const { body } = await serve(`Bearer ${secret}`)
    const sent = body!.requests.map((r) => r.request)

    expect(sent).toContain('shared and open')
    expect(sent).not.toContain('kept at home')
    expect(sent).not.toContain('already fulfilled')
  })

  // The reason the filter is a NULL-safe `or` rather than `not_equals: true`:
  // in Postgres, NULL <> true is unknown, and this row would vanish silently.
  it('sends a request that was never marked either way', async () => {
    const { body } = await serve(`Bearer ${secret}`)

    expect(body!.requests.map((r) => r.request)).toContain('never marked')
  })
})
