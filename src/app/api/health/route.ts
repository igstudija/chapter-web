import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

export async function GET() {
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

  return Response.json(
    {
      status: healthy ? 'ok' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      memory: { rss, heapUsed },
      db: dbOk ? 'ok' : 'error',
    },
    { status: healthy ? 200 : 503 },
  )
}
