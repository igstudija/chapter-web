export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (typeof process.on !== 'function') return

  const { logger } = await import('@/lib/logger')

  logger.info('Application starting', {
    nodeVersion: process.version,
    env: process.env.NODE_ENV || 'unknown',
    pid: process.pid,
  })

  // Memory monitoring & watchdog — production only (PM2 restarts on exit)
  if (process.env.NODE_ENV === 'production') {
    const GC_THRESHOLD_MB = 600
    const RESTART_THRESHOLD_MB = 900

    setInterval(() => {
      const mem = process.memoryUsage()
      const rss = Math.round(mem.rss / 1024 / 1024)
      const heapUsed = Math.round(mem.heapUsed / 1024 / 1024)
      const heapTotal = Math.round(mem.heapTotal / 1024 / 1024)
      const external = Math.round(mem.external / 1024 / 1024)
      logger.info(`[Memory] rss=${rss}MB heap=${heapUsed}/${heapTotal}MB external=${external}MB`)

      if (rss > GC_THRESHOLD_MB && typeof global.gc === 'function') {
        logger.info(`[Memory] RSS ${rss}MB > ${GC_THRESHOLD_MB}MB — triggering garbage collection`)
        global.gc()
      }

      if (rss > RESTART_THRESHOLD_MB) {
        logger.warn(`[Memory] RSS ${rss}MB > ${RESTART_THRESHOLD_MB}MB — restarting process to prevent OOM`)
        process.exit(1)
      }
    }, 5 * 60 * 1000).unref()

    let lastTick = Date.now()
    const WATCHDOG_INTERVAL = 5_000
    const WATCHDOG_THRESHOLD = 30_000

    setInterval(() => {
      const now = Date.now()
      const lag = now - lastTick - WATCHDOG_INTERVAL
      lastTick = now

      if (lag > WATCHDOG_THRESHOLD) {
        logger.error(`[Watchdog] Event loop blocked for ${Math.round(lag / 1000)}s — forcing restart`)
        process.exit(1)
      } else if (lag > 5_000) {
        logger.warn(`[Watchdog] Event loop lag: ${Math.round(lag / 1000)}s`)
      }
    }, WATCHDOG_INTERVAL).unref()
  }

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception — process will restart', error)
  })

  process.on('unhandledRejection', (reason) => {
    if (reason instanceof Error) {
      logger.error('Unhandled Promise Rejection', reason)
    } else {
      logger.error('Unhandled Promise Rejection', { reason: String(reason) })
    }
  })

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received — shutting down gracefully')
  })

  process.on('SIGINT', () => {
    logger.info('SIGINT received — shutting down')
  })
}

export async function onRequestError(
  error: { digest: string } & Error,
  request: {
    path: string
    method: string
    headers: { [key: string]: string }
  },
  context: {
    routerKind: 'Pages Router' | 'App Router'
    routePath: string
    routeType: 'render' | 'route' | 'action' | 'middleware'
    renderSource:
      | 'react-server-components'
      | 'react-server-components-payload'
      | 'server-rendering'
    revalidateReason: 'on-demand' | 'stale' | undefined
    renderType: 'dynamic' | 'dynamic-resume'
  },
) {
  const { logger } = await import('@/lib/logger')

  logger.error(`Request error: ${request.method} ${request.path}`, {
    digest: error.digest,
    errorMessage: error.message,
    errorName: error.name,
    route: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    renderType: context.renderType,
    revalidateReason: context.revalidateReason,
    stack: error.stack,
  })
}
