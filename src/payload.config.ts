import { postgresAdapter } from '@payloadcms/db-postgres'
import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import { supabaseStorageAdapter } from './lib/supabaseStorageAdapter'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { ADMIN_TITLE_SUFFIX } from './lib/branding'

import {
  Sites,
  Users,
  SiteMemberships,
  Media,
  PowerGroups,
  Events,
  Blog,
  SpecialRequests,
  Top40,
  Top20,
  ContactSubmissions,
  EventSubmissions,
  Wiki,
  SuccessStories,
  OneToOneMeetings,
  Referrals,
  AuditLogs,
  PolicyTemplates,
  AiSettings,
  // Site-scoped content collections
  HomepageSettings,
  ContactsPageSettings,
  AboutUsSettings,
  FAQSettings,
  SiteSettingsCollection,
  SlideshowSettingsCollection,
  ListingPagesSeo,
  CompaniesPageSettings,
} from './collections'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)


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
    components: {
      afterNavLinks: ['@/components/admin/SharedRequestsNavLink#SharedRequestsNavLink'],
      views: {
        sharedRequestsLink: {
          Component: '@/components/admin/SharedRequestsLinkView#SharedRequestsLinkView',
          path: '/shared-requests',
        },
      },
    },
  },
  collections: [
    Sites,
    PowerGroups,
    Users,
    SiteMemberships,
    Media,
    Events,
    Blog,
    SpecialRequests,
    Top40,
    Top20,
    SuccessStories,
    OneToOneMeetings,
    Referrals,
    ContactSubmissions,
    EventSubmissions,
    Wiki,
    AuditLogs,
    PolicyTemplates,
    AiSettings,
    // Site-scoped content (one per site)
    HomepageSettings,
    ContactsPageSettings,
    AboutUsSettings,
    FAQSettings,
    SiteSettingsCollection,
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
    pool: {
      connectionString: process.env.POSTGRESS_DATABASE_URL || '',
      // Sized for multi-tenant admin load: several admin sessions can each
      // hold 4-8 connections during a list view render.
      max: Number(process.env.PG_POOL_MAX) || 50,
      // `min: 0` lets the pool drain fully when idle. Holding warm
      // connections across long idle periods (>5min) provokes
      // "Connection terminated unexpectedly" from managed Postgres
      // providers that silently close idle sockets. New connections are
      // cheap; broken ones aren't.
      min: Number(process.env.PG_POOL_MIN) || 0,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 30_000,
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
  // file is buffered in memory. Per-type limits (15MB images / 50MB audio)
  // are enforced in the Media collection's beforeOperation hook.
  upload: {
    limits: { fileSize: 50 * 1024 * 1024 },
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
