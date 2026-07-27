import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SERVER_POOL_MAX,
  DEFAULT_SERVERLESS_POOL_MAX,
  MIN_SERVERLESS_POOL_MAX,
  PLANNED_CONCURRENT_INSTANCES,
  POOLER_CLIENT_LIMIT,
  resolvePgPoolMax,
} from '@/lib/pgPoolSize'

/**
 * Regression cover for the 2026-07-27 outage: the serverless pool was `1`, so
 * the homepage's parallel queries queued behind a single connection until
 * `connectionTimeoutMillis` expired. Every request to `/` returned 500 with
 * `timeout exceeded when trying to connect` — which reads as an unreachable
 * database, not as a pool that is one slot wide.
 *
 * Reproduced by running the built app against the real database with
 * `PG_POOL_MAX=1`: five concurrent requests, five 500s. At 10 the same five
 * requests all returned 200.
 */
describe('resolvePgPoolMax', () => {
  it('never hands a serverless instance too few slots to render one page', () => {
    const serverless = resolvePgPoolMax({ isServerless: true, override: undefined })

    // The bug, stated as an assertion: one slot cannot serve one render.
    expect(serverless).toBeGreaterThan(1)
    expect(serverless).toBeGreaterThanOrEqual(MIN_SERVERLESS_POOL_MAX)
    expect(serverless).toBe(DEFAULT_SERVERLESS_POOL_MAX)
  })

  it('leaves the pooler room for every instance that may be up at once', () => {
    /*
     * The mirror image of the outage above, and the one the first version of
     * this test missed: raising the default to 10 meant 30 concurrent requests
     * asked Supavisor for 300 client connections against a 200 limit, and it
     * refused all of them with `(EMAXCONN) max client connections reached`.
     * A floor alone is not enough — the ceiling has to be asserted too.
     */
    expect(DEFAULT_SERVERLESS_POOL_MAX * PLANNED_CONCURRENT_INSTANCES).toBeLessThanOrEqual(
      POOLER_CLIENT_LIMIT,
    )
  })

  it('keeps the larger pool on a long-running host', () => {
    expect(resolvePgPoolMax({ isServerless: false, override: undefined })).toBe(
      DEFAULT_SERVER_POOL_MAX,
    )
  })

  it('honours a usable PG_POOL_MAX on either kind of host', () => {
    expect(resolvePgPoolMax({ isServerless: true, override: '4' })).toBe(4)
    expect(resolvePgPoolMax({ isServerless: false, override: '12' })).toBe(12)
    expect(resolvePgPoolMax({ isServerless: true, override: '7.9' })).toBe(7)
  })

  it('ignores an override that would leave the pool unable to serve anyone', () => {
    // `PG_POOL_MAX=` and `PG_POOL_MAX=0` both used to fall through to the
    // default via `||`; keep that, and do not let a negative through either.
    for (const override of ['', '0', '-1', 'ten', undefined]) {
      expect(resolvePgPoolMax({ isServerless: true, override })).toBe(
        DEFAULT_SERVERLESS_POOL_MAX,
      )
    }
  })
})
