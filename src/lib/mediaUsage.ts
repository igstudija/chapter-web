import type {
  CollectionSlug,
  Field,
  Payload,
  PayloadRequest,
  SanitizedCollectionConfig,
} from 'payload'

/**
 * Which Media documents are still pointed at, and removal of the ones that are
 * not.
 *
 * An upload that nothing references is invisible: it does not appear on a
 * member, a slide or a page, but it still occupies the media library, the
 * bucket and the backup. Deleting the *reference* is the easy half — the file
 * outliving it is what leaves the library full of images nobody can place.
 *
 * The set of fields that can hold a Media reference is read from the Payload
 * config rather than listed here, because a hand-written list is wrong the day
 * someone adds a field and does not think of this file. Add an upload field
 * anywhere — a block, an array, a tab — and it is covered.
 *
 * ## What this does not see
 *
 * Older *versions* of a versioned document. Payload keeps a row per saved
 * version, and those rows carry their own relationships; a query against the
 * collection sees the published document and (with `draft`) the newest draft,
 * not version 7 of 12. `pnpm clean:media` reads foreign keys straight out of
 * Postgres and therefore does see them, which is why bulk deletion belongs to
 * the script and per-change deletion to the hooks: the hooks only ever handle
 * media that was just now removed from a document that is not versioned.
 */

/** A Media id as it can arrive: an id, a numeric string, or a populated doc. */
const toMediaId = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isNaN(value) ? null : value
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  if (value && typeof value === 'object' && 'id' in value) {
    return toMediaId((value as { id: unknown }).id)
  }
  return null
}

const pointsAtMedia = (field: Field): boolean => {
  if (field.type !== 'upload' && field.type !== 'relationship') return false
  const to = field.relationTo
  return Array.isArray(to) ? to.includes('media') : to === 'media'
}

/**
 * Every dot-path in a field tree that can hold a Media reference.
 *
 * Paths are the ones Payload's query engine understands, so they can be handed
 * straight to `where`: `slides.image` reaches into a blocks field,
 * `gallery.image` into an array, and both resolve to the right join.
 * Presentational wrappers (rows, collapsibles, unnamed tabs) contribute no
 * segment, matching how Payload stores their children.
 */
export const mediaFieldPaths = (fields: Field[], prefix = ''): string[] => {
  const paths: string[] = []
  const join = (name: string) => (prefix ? `${prefix}.${name}` : name)

  for (const field of fields) {
    if (pointsAtMedia(field) && 'name' in field) {
      paths.push(join(field.name))
      continue
    }

    switch (field.type) {
      case 'group':
      case 'array':
        // An unnamed group is a layout device: its children sit where it does.
        paths.push(...mediaFieldPaths(field.fields, 'name' in field ? join(field.name) : prefix))
        break
      case 'blocks':
        for (const block of field.blocks) {
          paths.push(...mediaFieldPaths(block.fields, join(field.name)))
        }
        break
      case 'tabs':
        for (const tab of field.tabs) {
          paths.push(
            ...mediaFieldPaths(tab.fields, 'name' in tab && tab.name ? join(tab.name) : prefix),
          )
        }
        break
      case 'row':
      case 'collapsible':
        paths.push(...mediaFieldPaths(field.fields, prefix))
        break
      default:
        break
    }
  }

  // A block field can declare the same path in several blocks (`slides.image`
  // in two block types is one queryable path), and a duplicate would only make
  // the `or` longer.
  return [...new Set(paths)]
}

/** Read every Media id a document holds at the given paths. */
export const mediaIdsAtPaths = (doc: unknown, paths: string[]): Set<number> => {
  const found = new Set<number>()

  const walk = (value: unknown, segments: string[]): void => {
    if (value === null || value === undefined) return

    if (Array.isArray(value)) {
      for (const entry of value) walk(entry, segments)
      return
    }

    if (segments.length === 0) {
      const id = toMediaId(value)
      if (id !== null) found.add(id)
      return
    }

    if (typeof value === 'object') {
      walk((value as Record<string, unknown>)[segments[0]], segments.slice(1))
    }
  }

  for (const path of paths) walk(doc, path.split('.'))
  return found
}

/** The collections that can reference Media, with the paths that do it. */
export const mediaReferenceMap = (payload: Payload): Map<CollectionSlug, string[]> => {
  const map = new Map<CollectionSlug, string[]>()

  for (const collection of payload.config.collections as SanitizedCollectionConfig[]) {
    if (collection.slug === 'media') continue
    const paths = mediaFieldPaths(collection.fields as Field[])
    if (paths.length) map.set(collection.slug as CollectionSlug, paths)
  }

  return map
}

const hasDrafts = (payload: Payload, slug: CollectionSlug): boolean => {
  const collection = payload.collections[slug]?.config
  return Boolean(collection?.versions && (collection.versions as { drafts?: unknown }).drafts)
}

/**
 * Of the given Media ids, which are still referenced by some document.
 *
 * `req` is passed through to every query so that, called from a hook, the
 * answer reflects the write in progress: the whole question is whether an
 * upload is *still* used after the change that dropped it, and a query outside
 * the transaction would answer about the state before.
 */
export const findMediaInUse = async ({
  payload,
  ids,
  req,
}: {
  payload: Payload
  ids: number[]
  req?: PayloadRequest
}): Promise<Set<number>> => {
  const inUse = new Set<number>()
  if (ids.length === 0) return inUse

  const candidates = new Set(ids)

  for (const [slug, paths] of mediaReferenceMap(payload)) {
    const where = { or: paths.map((path) => ({ [path]: { in: ids } })) }

    // Drafts live in a separate table, so a published document and an unsaved
    // draft of it are two answers to the same question. Both count as use.
    const queries = hasDrafts(payload, slug) ? [false, true] : [false]

    for (const draft of queries) {
      const { docs } = await payload.find({
        collection: slug,
        where,
        draft,
        depth: 0,
        limit: 0,
        pagination: false,
        req,
      })

      for (const doc of docs) {
        for (const id of mediaIdsAtPaths(doc, paths)) {
          if (candidates.has(id)) inUse.add(id)
        }
      }
    }

    if (inUse.size === candidates.size) break
  }

  return inUse
}

/**
 * Delete the given Media documents, skipping any that something still points
 * at. Returns the ids actually deleted.
 *
 * Never throws. This runs as a side effect of saving something else — a member
 * updating their slide must not fail because a bucket call did, and a file left
 * behind is recoverable by `pnpm clean:media` while a rejected save is lost
 * work.
 */
export const deleteUnusedMedia = async ({
  payload,
  ids,
  req,
  reason,
}: {
  payload: Payload
  ids: number[]
  req?: PayloadRequest
  reason: string
}): Promise<number[]> => {
  if (ids.length === 0) return []

  const deleted: number[] = []

  try {
    const inUse = await findMediaInUse({ payload, ids, req })

    for (const id of ids) {
      if (inUse.has(id)) continue
      try {
        await payload.delete({ collection: 'media', id, req })
        deleted.push(id)
      } catch (error) {
        console.error(
          `[Media] Could not delete unused media ${id} (${reason}):`,
          error instanceof Error ? error.message : error,
        )
      }
    }

    if (deleted.length) {
      console.log(`[Media] Deleted ${deleted.length} unused upload(s) after ${reason}: ${deleted.join(', ')}`)
    }
  } catch (error) {
    console.error(
      `[Media] Unused-media check failed (${reason}):`,
      error instanceof Error ? error.message : error,
    )
  }

  return deleted
}
