/**
 * Simple in-memory rate limiter for API endpoints
 *
 * Tracks requests per IP address with sliding window.
 * Automatically cleans up old entries.
 *
 * The store is per-process. On one long-running server that is the whole
 * picture; on a serverless host each concurrent instance keeps its own counters,
 * so the effective limit is roughly `maxRequests × instances` and an attacker
 * with enough parallelism gets proportionally more attempts. It still stops
 * casual abuse and accidental loops, which is most of the value, but a install
 * that needs a hard guarantee wants a shared store (Postgres, Redis) or the
 * platform's own firewall/rate-limiting in front of these routes.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (resets on server restart, which is acceptable for rate limiting)
const MAX_STORE_SIZE = 10_000
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
let cleanupInterval: NodeJS.Timeout | null = null

function startCleanup() {
  if (cleanupInterval) return
  cleanupInterval = setInterval(
    () => {
      const now = Date.now()
      for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
          rateLimitStore.delete(key)
        }
      }
    },
    5 * 60 * 1000,
  )
  cleanupInterval.unref()
}

function evictIfFull() {
  if (rateLimitStore.size < MAX_STORE_SIZE) return
  // Delete oldest 20% of entries
  const toDelete = Math.floor(MAX_STORE_SIZE * 0.2)
  const iterator = rateLimitStore.keys()
  for (let i = 0; i < toDelete; i++) {
    const key = iterator.next().value
    if (key) rateLimitStore.delete(key)
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
  /** Unique identifier for this rate limit (e.g., 'superadmin-delete') */
  identifier: string
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

/**
 * Check rate limit for a given IP and identifier
 */
export function checkRateLimit(ip: string, config: RateLimitConfig): RateLimitResult {
  startCleanup()

  const key = `${config.identifier}:${ip}`
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // No entry or expired - create new
  if (!entry || entry.resetAt < now) {
    evictIfFull()
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    }
  }

  // Entry exists and not expired
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  // Increment count
  entry.count++
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIp(headers: Headers): string {
  // Check common proxy headers
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can be comma-separated, take the first one
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Cloudflare
  const cfConnectingIp = headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Vercel
  const vercelForwardedFor = headers.get('x-vercel-forwarded-for')
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim()
  }

  return 'unknown'
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMITS = {
  /** Destructive admin operations: 10 per minute */
  ADMIN_DELETE: {
    identifier: 'admin-delete',
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Login: 5 attempts per 15 minutes */
  LOGIN: {
    identifier: 'login',
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  /** General API: 100 requests per minute */
  GENERAL_API: {
    identifier: 'general-api',
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  /**
   * Unauthenticated endpoints that send mail — password resets, magic links.
   *
   * These are reachable by anyone who knows a member's address, and each call
   * puts a message in that person's inbox. Without a limit they are a way to
   * flood a member with mail, burn the SMTP provider's quota, and get the
   * sending domain reported as spam. 5 per 15 minutes is well above what a
   * person retrying a login does and far below what makes flooding worthwhile.
   */
  EMAIL_TRIGGER: {
    identifier: 'email-trigger',
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
} as const
