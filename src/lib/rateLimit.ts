/**
 * Simple in-memory rate limiter for API endpoints
 *
 * Tracks requests per IP address with sliding window.
 * Automatically cleans up old entries.
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
  /** Superadmin delete operations: 10 per minute */
  SUPERADMIN_DELETE: {
    identifier: 'superadmin-delete',
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Superadmin login: 5 attempts per 15 minutes */
  SUPERADMIN_LOGIN: {
    identifier: 'superadmin-login',
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  /** General API: 100 requests per minute */
  GENERAL_API: {
    identifier: 'general-api',
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  /** AI Chat: 20 messages per minute per user */
  AI_CHAT: {
    identifier: 'ai-chat',
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
} as const
