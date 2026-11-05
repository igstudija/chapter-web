import { unstable_cache, revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

/**
 * Cache what everybody sees, and drop it the moment it changes.
 *
 * Every page here is `force-dynamic` and nothing was cached, so each visitor
 * paid for the same handful of queries — the settings singleton alone is read
 * on every route, several times per render. That is fine for a chapter and
 * stops being fine the evening a newsletter goes out.
 *
 * The usual answer, a revalidation interval, buys speed with staleness: an
 * editor saves, the page keeps showing the old text for the rest of the window,
 * and support becomes "try Ctrl+F5". So there is no interval here. Entries live
 * until the collection they came from is written to, and `revalidateOnChange`
 * on that collection drops them — the next request rebuilds from the database.
 * Cached and current are not in tension if the invalidation is event-driven.
 *
 * **Only cache reads that are the same for everybody.** The cache key is the
 * one passed in; it knows nothing about who is asking. A query narrowed by the
 * signed-in member — their own requests, anything gated on role — must not go
 * through here, or one member's data is served to the next. Site settings,
 * published posts and the page copy are safe because they do not vary.
 */

/** The tag a collection's cached reads are filed under. */
export const cacheTagFor = (collection: string) => `collection:${collection}`

/**
 * Cache a read until one of `collections` is written to.
 *
 * `keyParts` must describe everything the result depends on. Two reads sharing
 * a key share an answer, which is the point and also the hazard.
 */
export function cachedRead<Args extends unknown[], Result>(
  read: (...args: Args) => Promise<Result>,
  keyParts: string[],
  collections: string[],
): (...args: Args) => Promise<Result> {
  return unstable_cache(read, keyParts, { tags: collections.map(cacheTagFor) })
}

/**
 * Payload hooks that clear a collection's cached reads after a write.
 *
 * Spread into a collection's `hooks`. Both halves matter: a deletion changes
 * what a list returns just as much as an edit does, and only the pair keeps a
 * removed post from outliving itself on the front page.
 */
export const revalidateOnChange = (
  collection: string,
): {
  afterChange: [CollectionAfterChangeHook]
  afterDelete: [CollectionAfterDeleteHook]
} => {
  /*
   * `revalidateTag` throws outside a Next request — "static generation store
   * missing" — and a Payload write does not always come from one. `pnpm
   * bootstrap` creates the settings document from a terminal; so does a seed.
   * Letting that escape would abort the write itself, so an install would fail
   * at its first step because of a cache that does not exist yet.
   *
   * The trade-off is worth naming rather than hiding: a write from a script
   * cannot reach a running server's cache, so if one is up it keeps its copy
   * until something is next saved through the admin. Scripts here run before
   * or beside a deploy rather than against a live one, which is why that is a
   * footnote and not a defect.
   */
  const drop = () => {
    try {
      // `expire: 0` keeps the old meaning: gone now, not served stale once more.
      // Next 16 made the profile argument required, and 'max' would mean
      // stale-while-revalidate, so an edit would show only on the second load.
      revalidateTag(cacheTagFor(collection), { expire: 0 })
    } catch {
      // No request, no cache to drop. Carry on with the write.
    }
  }
  return {
    afterChange: [
      ({ doc }) => {
        drop()
        return doc
      },
    ],
    afterDelete: [
      ({ doc }) => {
        drop()
        return doc
      },
    ],
  }
}
