/**
 * One linked chapter, as the rest of the exchange sees it.
 *
 * The collection record carries more — timestamps, the regeneration checkbox —
 * but these are the fields every step of the exchange actually reads, and they
 * travelled together as three near-identical shapes before they were one.
 */
export interface ChapterConnection {
  id: string | number
  /** What we call them. Ours, so a partner cannot relabel itself in our list. */
  name: string
  /** The secret we minted and handed over; what they present to read us. */
  ourSecret?: string | null
  /** Their key; what we present to read them. Absent on a share-only link. */
  theirKey?: string | null
  paused?: boolean | null
}
