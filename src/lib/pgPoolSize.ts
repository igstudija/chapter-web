/**
 * How many Postgres connections one process may hold.
 *
 * This lived inline in `payload.config.ts`, where nothing could assert on it —
 * and on 2026-07-27 the serverless value was `1`, which took production down
 * for hours. The failure did not look like a pool problem: every request to `/`
 * returned 500 with `timeout exceeded when trying to connect`, which reads as
 * an unreachable database, and the same connection string worked fine from a
 * laptop. It was `pg-pool` giving up waiting for a slot.
 *
 * A single render fans out — the homepage alone runs three `Promise.all` blocks
 * of `payload.find` plus the settings count — so one slot means those queries
 * queue behind each other until `connectionTimeoutMillis` expires. The pool has
 * to be at least as wide as one page's concurrent queries, or the page cannot
 * render at all, however healthy the database is.
 */

/**
 * Smallest serverless pool that still lets one page render.
 *
 * Not a tuning knob — a floor. Below this a single request deadlocks against
 * itself, so anything under it is a bug rather than a conservative choice.
 */
export const MIN_SERVERLESS_POOL_MAX = 5

/** Serverless default: small per instance, in front of a pooler that multiplexes. */
export const DEFAULT_SERVERLESS_POOL_MAX = 10

/**
 * Long-running host default: one process serves everything, and several admin
 * sessions can each hold 4-8 connections during a list view render.
 */
export const DEFAULT_SERVER_POOL_MAX = 50

interface PoolSizeInput {
  /** Whether this process is a serverless function instance. */
  readonly isServerless: boolean
  /** Raw `PG_POOL_MAX`, if the host or plan calls for something else. */
  readonly override?: string | undefined
}

/**
 * Resolve the pool ceiling, honouring `PG_POOL_MAX` when it is a usable number.
 *
 * A non-numeric or non-positive override is ignored rather than obeyed: an
 * empty string or a stray `PG_POOL_MAX=0` would otherwise resolve to a pool
 * that can never hand out a connection.
 */
export function resolvePgPoolMax({ isServerless, override }: PoolSizeInput): number {
  const parsed = Number(override)
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed)
  }

  return isServerless ? DEFAULT_SERVERLESS_POOL_MAX : DEFAULT_SERVER_POOL_MAX
}
