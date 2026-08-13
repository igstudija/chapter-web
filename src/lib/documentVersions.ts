/**
 * Keep every document in a drafts-enabled collection visible to the admin.
 *
 * The admin list view does not read the collection's own table. For a
 * collection with `versions.drafts` it calls `payload.find({ draft: true })`,
 * which Payload routes to `db.queryDrafts`, and that reads `_<collection>_v`
 * and nothing else. So a document that exists in `events` but has no row in
 * `_events_v` is not "unpublished" or "filtered out" — it is unreachable from
 * the list, while `/api/events` returns it happily. The two views disagree, and
 * the one an editor uses is the one that is wrong.
 *
 * Rows arrive in that state whenever something writes the main table directly:
 * `scripts/migrate-legacy-site.mjs` copies tables verbatim to keep foreign keys
 * valid, a SQL restore does the same, and turning `drafts: true` on for a
 * collection that already holds rows creates the empty `_v` table beside them.
 * None of those are mistakes on their own; each just leaves half the job.
 *
 * The repair is one published version per orphaned document, written by
 * re-saving through the Local API rather than by inserting into `_..._v`
 * directly. The version tables mirror the whole field structure — blocks and
 * relationship rows in their own side tables — and Payload is the only thing
 * that knows how to build that shape for an arbitrary collection. A hand-rolled
 * INSERT would work for a flat collection and quietly lose the blocks of `wiki`.
 *
 * The re-save bumps `updatedAt`. That is the price of using the supported path,
 * and it is cheaper than writing timestamps back underneath Payload.
 */

/**
 * What this module needs from Payload, and no more.
 *
 * Narrow on purpose: the real `Payload` satisfies it structurally, and a test
 * can supply a plain object instead of standing up a database. The arguments
 * stay `any` because Payload's own signatures are generic over the collection
 * slug, and narrowing them here would mean restating the whole config type.
 */
export type VersionCapablePayload = {
  config: {
    collections: Array<{ slug: string; versions?: unknown }>
  }
  find: (args: any) => Promise<any>
  findVersions: (args: any) => Promise<any>
  update: (args: any) => Promise<any>
}

export type CollectionVersionReport = {
  collection: string
  /** Documents in the collection's own table. */
  total: number
  /** Ids with no row in the versions table — invisible in the admin list. */
  missing: Array<number | string>
  /** How many of `missing` were given a version. Zero unless `apply`. */
  backfilled: number
  /** Ids the re-save threw on, with the reason. */
  failed: Array<{ id: number | string; error: string }>
}

/** The slugs whose admin list reads the versions table instead of the collection. */
export const draftEnabledCollections = (payload: VersionCapablePayload): string[] =>
  payload.config.collections
    .filter((collection) =>
      Boolean((collection.versions as { drafts?: unknown } | undefined)?.drafts),
    )
    .map((collection) => collection.slug)

/**
 * Ids in `collection` that have no version row at all.
 *
 * Both sides are fetched as bare id lists and compared in memory. The cheaper
 * shape — compare a count of documents against a count of `latest` versions —
 * needs `latest` to be queryable through the API, which is an internal column
 * rather than a documented field, and it answers wrongly the moment one
 * document carries several versions while another carries none.
 */
export async function findDocsMissingVersions(
  payload: VersionCapablePayload,
  collection: string,
): Promise<{ total: number; missing: Array<number | string> }> {
  const docs = await payload.find({
    collection,
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    select: {},
  })

  const ids: Array<number | string> = docs.docs.map((doc: { id: number | string }) => doc.id)
  if (ids.length === 0) return { total: 0, missing: [] }

  const versions = await payload.findVersions({
    collection,
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    where: { parent: { in: ids } },
    select: { parent: true },
  })

  /*
   * `parent` comes back as an id at depth 0, but a populated object is the
   * documented shape at greater depth; reading both keeps this correct if a
   * caller ever passes its own depth.
   */
  const versioned = new Set(
    versions.docs.map((version: { parent: number | string | { id: number | string } }) =>
      String(
        typeof version.parent === 'object' && version.parent !== null
          ? version.parent.id
          : version.parent,
      ),
    ),
  )

  return { total: ids.length, missing: ids.filter((id) => !versioned.has(String(id))) }
}

/**
 * Report — and optionally repair — documents the admin list cannot see.
 *
 * Read-only unless `apply` is set, so the same call can drive a dry run, a
 * start-up check and the repair itself.
 */
export async function backfillMissingVersions(
  payload: VersionCapablePayload,
  options: {
    /** Defaults to every drafts-enabled collection. */
    collections?: string[]
    /** Write the missing versions. Off by default. */
    apply?: boolean
  } = {},
): Promise<CollectionVersionReport[]> {
  const slugs = options.collections ?? draftEnabledCollections(payload)
  const reports: CollectionVersionReport[] = []

  for (const collection of slugs) {
    const { total, missing } = await findDocsMissingVersions(payload, collection)
    const report: CollectionVersionReport = {
      collection,
      total,
      missing,
      backfilled: 0,
      failed: [],
    }

    if (options.apply) {
      for (const id of missing) {
        try {
          /*
           * An empty `data` is the whole point: Payload merges it over the
           * stored document, so the re-save changes no field and its only
           * effect is the version row that should have been there.
           */
          await payload.update({ collection, id, data: {}, depth: 0, overrideAccess: true })
          report.backfilled += 1
        } catch (error) {
          report.failed.push({ id, error: (error as Error).message })
        }
      }
    }

    reports.push(report)
  }

  return reports
}
