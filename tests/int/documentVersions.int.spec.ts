import { describe, expect, it, vi } from 'vitest'
import {
  backfillMissingVersions,
  draftEnabledCollections,
  findDocsMissingVersions,
  type VersionCapablePayload,
} from '@/lib/documentVersions'

/**
 * A Payload stand-in holding two tables per collection: the documents, and the
 * parent ids that have a version row. That is the whole shape this module
 * reasons about, and it is the shape the real bug lives in — rows on one side,
 * nothing on the other.
 */
const fakePayload = (
  tables: Record<string, { ids: Array<number | string>; versioned: Array<number | string> }>,
  options: { failOn?: Array<number | string> } = {},
) => {
  const update = vi.fn(async ({ collection, id }: { collection: string; id: number | string }) => {
    if (options.failOn?.includes(id)) throw new Error('update refused')
    tables[collection].versioned.push(id)
    return { id }
  })

  const payload: VersionCapablePayload & { update: typeof update } = {
    config: {
      collections: [
        { slug: 'events', versions: { drafts: true } },
        { slug: 'blog', versions: { drafts: true } },
        { slug: 'members', versions: undefined },
        { slug: 'audit-logs', versions: { drafts: false } },
      ],
    },
    find: async ({ collection }: { collection: string }) => ({
      docs: tables[collection].ids.map((id) => ({ id })),
    }),
    findVersions: async ({ collection }: { collection: string }) => ({
      docs: tables[collection].versioned.map((parent) => ({ parent })),
    }),
    update,
  }

  return payload
}

describe('draftEnabledCollections', () => {
  it('picks only the collections whose admin list reads the versions table', () => {
    // `members` has no versions and `audit-logs` has them without drafts; the
    // list view queries those tables directly, so neither can be affected.
    const payload = fakePayload({})

    expect(draftEnabledCollections(payload)).toEqual(['events', 'blog'])
  })
})

describe('findDocsMissingVersions', () => {
  it('reports the documents with no version row', async () => {
    const payload = fakePayload({ events: { ids: [1, 2, 3], versioned: [2] } })

    await expect(findDocsMissingVersions(payload, 'events')).resolves.toEqual({
      total: 3,
      missing: [1, 3],
    })
  })

  it('reports nothing when every document is versioned', async () => {
    const payload = fakePayload({ events: { ids: [1, 2], versioned: [1, 2] } })

    await expect(findDocsMissingVersions(payload, 'events')).resolves.toEqual({
      total: 2,
      missing: [],
    })
  })

  it('does not ask for versions of an empty collection', async () => {
    // `parent: { in: [] }` is a query with no answer worth making, and some
    // adapters read it as "no constraint" and return the table.
    const payload = fakePayload({ events: { ids: [], versioned: [] } })
    const findVersions = vi.spyOn(payload, 'findVersions')

    await expect(findDocsMissingVersions(payload, 'events')).resolves.toEqual({
      total: 0,
      missing: [],
    })
    expect(findVersions).not.toHaveBeenCalled()
  })

  it('matches ids across the string/number divide', async () => {
    // Postgres hands back numeric ids and Payload's own APIs stringify them in
    // places; comparing the two raw would rewrite every document every boot.
    const payload = fakePayload({ events: { ids: [1, 2], versioned: ['1', '2'] } })

    await expect(findDocsMissingVersions(payload, 'events')).resolves.toEqual({
      total: 2,
      missing: [],
    })
  })
})

describe('backfillMissingVersions', () => {
  it('writes nothing unless asked to', async () => {
    const payload = fakePayload({
      events: { ids: [1, 2], versioned: [] },
      blog: { ids: [1], versioned: [1] },
    })

    const reports = await backfillMissingVersions(payload)

    expect(payload.update).not.toHaveBeenCalled()
    expect(reports).toEqual([
      { collection: 'events', total: 2, missing: [1, 2], backfilled: 0, failed: [] },
      { collection: 'blog', total: 1, missing: [], backfilled: 0, failed: [] },
    ])
  })

  it('re-saves each orphan without touching a field', async () => {
    const payload = fakePayload({
      events: { ids: [1, 2], versioned: [2] },
      blog: { ids: [7], versioned: [] },
    })

    const reports = await backfillMissingVersions(payload, { apply: true })

    expect(payload.update).toHaveBeenCalledTimes(2)
    expect(payload.update).toHaveBeenCalledWith({
      collection: 'events',
      id: 1,
      data: {},
      depth: 0,
      overrideAccess: true,
    })
    expect(reports.map((r) => r.backfilled)).toEqual([1, 1])
  })

  it('keeps going when one document cannot be saved, and says which', async () => {
    // One document failing validation must not leave the rest invisible.
    const payload = fakePayload({ events: { ids: [1, 2, 3], versioned: [] } }, { failOn: [2] })

    const [report] = await backfillMissingVersions(payload, {
      apply: true,
      collections: ['events'],
    })

    expect(report.backfilled).toBe(2)
    expect(report.failed).toEqual([{ id: 2, error: 'update refused' }])
  })

  it('is a no-op on a second run', async () => {
    const payload = fakePayload({ events: { ids: [1, 2], versioned: [] } })

    await backfillMissingVersions(payload, { apply: true, collections: ['events'] })
    ;(payload.update as ReturnType<typeof vi.fn>).mockClear()
    const [report] = await backfillMissingVersions(payload, {
      apply: true,
      collections: ['events'],
    })

    expect(payload.update).not.toHaveBeenCalled()
    expect(report.missing).toEqual([])
  })
})
