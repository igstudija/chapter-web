import { postgresAdapter } from '@payloadcms/db-postgres'
import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import { supabaseStorageAdapter } from './lib/supabaseStorageAdapter'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { ADMIN_TITLE_SUFFIX } from './lib/branding'
import { IS_SERVERLESS } from './lib/runtime'
import { resolvePgPoolMax } from './lib/pgPoolSize'
import { MAX_UPLOAD_BYTES } from './lib/uploadLimits'

import {
  Users,
  Members,
  Media,
  PowerGroups,
  Events,
  Blog,
  SpecialRequests,
  ChapterConnections,
  Top40,
  Top20,
  ContactSubmissions,
  EventSubmissions,
  Wiki,
  SuccessStories,
  AuditLogs,
  PolicyTemplates,
  // Site-scoped content collections
  HomepageSettings,
  ContactsPageSettings,
  AboutUsSettings,
  FAQSettings,
  Settings,
  SlideshowSettingsCollection,
  ListingPagesSeo,
  CompaniesPageSettings,
} from './collections'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Per-query ceiling, in ms. `pg` sends this in the connection startup packet as
 * `options=-c statement_timeout=…`, and a connection pooler in front of
 * Postgres may reject startup parameters it does not recognise — every
 * connection then fails with "unsupported startup parameter" rather than
 * anything about timeouts. `PG_STATEMENT_TIMEOUT=0` drops the parameter
 * entirely, which is the fix if you meet that error.
 */
const STATEMENT_TIMEOUT_MS = Number(process.env.PG_STATEMENT_TIMEOUT ?? 30_000)


export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ADMIN_TITLE_SUFFIX,
    },
    theme: 'dark',
  },
  collections: [
    PowerGroups,
    Users,
    Members,
    Media,
    Events,
    Blog,
    SpecialRequests,
    ChapterConnections,
    Top40,
    Top20,
    SuccessStories,
        ContactSubmissions,
    EventSubmissions,
    Wiki,
    AuditLogs,
    PolicyTemplates,
    // Site-scoped content (one per site)
    HomepageSettings,
    ContactsPageSettings,
    AboutUsSettings,
    FAQSettings,
    Settings,
    SlideshowSettingsCollection,
    ListingPagesSeo,
    CompaniesPageSettings,
  ],
  globals: [],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    /*
     * Schema push rewrites the live database to match whatever the code says.
     * Payload turns it on for anything that is not `NODE_ENV=production`, and
     * that includes vitest, which runs as `test` — so `pnpm test:int` was
     * reshaping the schema of whichever database `.env` points at, and here
     * that is production. The test timing out on the push is what kept it from
     * doing damage. Narrow it to an actual dev server, which is where this
     * project genuinely relies on push to land new fields.
     */
    push: process.env.NODE_ENV === 'development',
    pool: {
      connectionString: process.env.POSTGRESS_DATABASE_URL || '',
      // Sizing lives in `pgPoolSize` so it can be asserted on: too small a pool
      // deadlocks a single render against itself, and that is worth a test
      // rather than a comment. Override with PG_POOL_MAX.
      max: resolvePgPoolMax({ isServerless: IS_SERVERLESS, override: process.env.PG_POOL_MAX }),
      // `min: 0` lets the pool drain fully when idle. Holding warm
      // connections across long idle periods (>5min) provokes
      // "Connection terminated unexpectedly" from managed Postgres
      // providers that silently close idle sockets. New connections are
      // cheap; broken ones aren't.
      min: Number(process.env.PG_POOL_MIN) || 0,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      ...(STATEMENT_TIMEOUT_MS > 0 ? { statement_timeout: STATEMENT_TIMEOUT_MS } : {}),
      // TCP keepalive keeps NAT / load balancer / pgBouncer from
      // dropping the socket while we hold a connection in the pool.
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    },
  }),
  onInit: async (payload) => {
    const dbPool = (payload.db as any).pool

    // Swallow idle-client errors so a dropped backend socket doesn't
    // crash the whole Node process (default `pg.Pool` behavior emits
    // 'error' which Node treats as uncaughtException).
    if (dbPool?.on) {
      dbPool.on('error', (err: Error) => {
        console.warn(`[DB Pool] Idle client error (recovered): ${err.message}`)
      })
    }

    // Per-query timing. In dev defaults to 100ms threshold so admin slowdowns
    // surface immediately; production stays opt-in via SLOW_QUERY_LOG=1.
    const isDev = process.env.NODE_ENV !== 'production'
    const SLOW_QUERY_MS = Number(process.env.SLOW_QUERY_MS) || (isDev ? 100 : 1000)
    const enabled = process.env.SLOW_QUERY_LOG === '1' || isDev
    if (!enabled) return

    if (dbPool?.on) {
      dbPool.on('connect', (client: any) => {
        const originalQuery = client.query.bind(client)
        client.query = (...args: any[]) => {
          const start = Date.now()
          const result = originalQuery(...args)
          if (result && typeof result.then === 'function') {
            result
              .then(() => {
                const duration = Date.now() - start
                if (duration > SLOW_QUERY_MS) {
                  const q = typeof args[0] === 'string' ? args[0] : args[0]?.text || ''
                  console.warn(`[Slow Query] ${duration}ms: ${q.slice(0, 200)}`)
                }
              })
              .catch(() => {})
          }
          return result
        }
      })
      console.log(`[DB] Slow query monitoring enabled (>${SLOW_QUERY_MS}ms)`)
    }
  },
  sharp,
  // Hard backstop for ALL uploads: bodies above this are rejected before the
  // file is buffered in memory. Per-type limits (images / audio) are enforced
  // in the Media collection's beforeOperation hook, which is where a user-facing
  // message comes from.
  upload: {
    limits: { fileSize: MAX_UPLOAD_BYTES },
    abortOnLimit: true,
  },
  plugins: [
    cloudStoragePlugin({
      collections: {
        media: {
          adapter: supabaseStorageAdapter(),
          prefix: 'media',
          // Files are public; serving them straight from Supabase keeps image
          // traffic off the Node process entirely. See the adapter docblock.
          disablePayloadAccessControl: true,
        },
      },
    }),
  ],
})
