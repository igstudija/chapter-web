import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { deleteUnusedMedia, mediaIdsAtPaths } from '../lib/mediaUsage'

/**
 * Collection hooks that delete an upload the moment it stops being used.
 *
 * A member swapping their presentation slide for a new one, or dropping a photo
 * out of the sequence, used to leave the old file in the media library forever:
 * nothing pointed at it, nothing displayed it, and nothing knew it was safe to
 * remove. Multiply that by every edit and the library fills with images nobody
 * can identify — half the collection here was exactly that.
 *
 * The rule these implement: an upload removed from the field that held it is
 * deleted, unless some *other* document still points at the same file. That
 * second half matters, because uploads are shared — a member's slide image can
 * also be their profile photo, and the same file can sit on two slides.
 *
 * Set `MEDIA_CLEANUP=off` to disable, which turns removal back into the old
 * behaviour of accumulating orphans that `pnpm clean:media` sweeps up later.
 */

const disabled = (): boolean => process.env.MEDIA_CLEANUP === 'off'

/**
 * Delete uploads that this save removed from `paths`.
 *
 * Only fires on update: a create removes nothing, and the delete case is
 * `cleanUpMediaOnDelete`.
 */
export const cleanUpMediaOnChange =
  (paths: string[]): CollectionAfterChangeHook =>
  async ({ collection, doc, operation, previousDoc, req }) => {
    if (operation !== 'update' || disabled()) return doc

    const before = mediaIdsAtPaths(previousDoc, paths)
    const after = mediaIdsAtPaths(doc, paths)
    const removed = [...before].filter((id) => !after.has(id))

    if (removed.length) {
      await deleteUnusedMedia({
        payload: req.payload,
        ids: removed,
        req,
        reason: `${collection.slug} ${doc?.id} edit`,
      })
    }

    return doc
  }

/**
 * Delete the uploads a deleted document held.
 *
 * Runs after the row is gone, so the reference check sees the world without it
 * and an upload used only by this document comes out unused.
 */
export const cleanUpMediaOnDelete =
  (paths: string[]): CollectionAfterDeleteHook =>
  async ({ collection, doc, req }) => {
    if (disabled()) return doc

    const held = [...mediaIdsAtPaths(doc, paths)]
    if (held.length) {
      await deleteUnusedMedia({
        payload: req.payload,
        ids: held,
        req,
        reason: `${collection.slug} ${doc?.id} deletion`,
      })
    }

    return doc
  }
