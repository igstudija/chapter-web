/* eslint-disable no-console */
import { getPayload } from 'payload'
import config from '../src/payload.config'
import {
  getSiteIdFromHostname,
  siteScopedActiveMember,
  siteScopedAdmin,
  invalidateHostnameCache,
} from '../src/access/multisite'

/**
 * Microbenchmark the hot paths an admin list view hits.
 * Simulates a single admin request issuing several access checks.
 */
const time = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
  const t = process.hrtime.bigint()
  const v = await fn()
  const ms = Number(process.hrtime.bigint() - t) / 1e6
  console.log(`  ${ms.toFixed(2).padStart(8)}ms  ${label}`)
  return v
}

const main = async () => {
  const payload = await getPayload({ config })

  const sites = await payload.find({ collection: 'sites', limit: 5, depth: 0 })
  const site = sites.docs[0] as any
  const hostname = site?.domain || 'localhost'

  const ms = await payload.find({
    collection: 'site-memberships',
    where: { site: { equals: site.id } },
    limit: 1,
    depth: 0,
  })
  const user = await payload.findByID({
    collection: 'users',
    id: (ms.docs[0] as any).user,
    depth: 0,
  })

  console.log(`Site: ${site.name} (${hostname}, id=${site.id})`)
  console.log(`User: ${(user as any).email}\n`)

  // Reset all caches for a cold-start measurement
  invalidateHostnameCache()

  // Simulate a single admin request: one `req` object reused across the
  // 3-5 access checks Payload fires per list view.
  const buildReq = (): any => ({
    user,
    payload,
    headers: new Map([['host', hostname]]),
  })

  console.log('─── Single admin request: ~4 access checks (cold) ───────────────')
  const reqCold = buildReq()
  await time('siteScopedActiveMember (read)', () =>
    Promise.resolve(siteScopedActiveMember({ req: reqCold } as any)),
  )
  await time('siteScopedAdmin (update)', () =>
    Promise.resolve(siteScopedAdmin({ req: reqCold } as any)),
  )
  await time('siteScopedActiveMember (delete)', () =>
    Promise.resolve(siteScopedActiveMember({ req: reqCold } as any)),
  )
  await time('siteScopedAdmin (baseListFilter)', () =>
    Promise.resolve(siteScopedAdmin({ req: reqCold } as any)),
  )

  console.log('\n─── Next admin request (warm hostname cache, NEW req) ─────────')
  const reqWarm = buildReq()
  await time('siteScopedActiveMember (read)', () =>
    Promise.resolve(siteScopedActiveMember({ req: reqWarm } as any)),
  )
  await time('siteScopedAdmin (update)', () =>
    Promise.resolve(siteScopedAdmin({ req: reqWarm } as any)),
  )
  await time('siteScopedActiveMember (delete)', () =>
    Promise.resolve(siteScopedActiveMember({ req: reqWarm } as any)),
  )

  console.log('\n─── Collection list fetch (depth 0) ──────────────────────────')
  for (const c of ['site-memberships', 'referrals', 'top40', 'one-to-one-meetings', 'media'] as const) {
    await time(c, () =>
      payload.find({
        collection: c as any,
        where: { site: { equals: site.id } },
        limit: 50,
        depth: 0,
      }),
    )
  }

  console.log('\n─── Same fetch repeated (warm SDK) ───────────────────────────')
  for (const c of ['site-memberships', 'referrals', 'top40', 'one-to-one-meetings', 'media'] as const) {
    await time(c, () =>
      payload.find({
        collection: c as any,
        where: { site: { equals: site.id } },
        limit: 50,
        depth: 0,
      }),
    )
  }

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
