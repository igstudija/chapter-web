import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

/**
 * Whether the caller may see the details. Uptime, memory and database state
 * are operational data, not something to hand an anonymous visitor; the
 * container health check and uptime monitors only need the status code.
 * Set HEALTH_TOKEN and send it as `x-health-token` to get the full body.
 */
const wantsDetails = (request: Request) => {
  const token = process.env.HEALTH_TOKEN
  return Boolean(token) && request.headers.get('x-health-token') === token
}

export async function GET(request: Request) {
  const mem = process.memoryUsage()
  const rss = Math.round(mem.rss / 1024 / 1024)
  const heapUsed = Math.round(mem.heapUsed / 1024 / 1024)

  // Check DB connectivity with a simple query
  let dbOk = false
  try {
    const payload = await getPayload({ config })
    await payload.find({ collection: 'users', limit: 1, depth: 0 })
    dbOk = true
  } catch {
    // DB is down
  }

  // Health = "can serve requests". Memory is NOT a health criterion here:
  // failing health on RSS below the self-restart thresholds (instrumentation.ts
  // exits at 900MB, pm2 restarts at 1G) left the container marked unhealthy —
  // so the proxy stopped routing to it — while nothing ever restarted it.
  // Memory numbers stay in the response body for observability only.
  const healthy = dbOk

  const status = healthy ? 'ok' : 'unhealthy'
  return Response.json(
    wantsDetails(request)
      ? {
          status,
          timestamp: new Date().toISOString(),
          uptime: Math.round(process.uptime()),
          memory: { rss, heapUsed },
          db: dbOk ? 'ok' : 'error',
        }
      : { status },
    { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
