/**
 * Centralized configuration constants
 * Single source of truth for environment-specific values
 */

/**
 * Default query limits for different contexts
 */
export const QUERY_LIMITS = {
  /** Default limit for list pages */
  LIST_DEFAULT: 100,
  /** Maximum limit for admin queries */
  ADMIN_MAX: 1000,
  /** Limit for autocomplete/search suggestions */
  SUGGESTIONS: 20,
  /** Limit for recent items */
  RECENT: 10,
} as const

/**
 * JWT token expiration time in seconds
 */
export const JWT_EXPIRATION = 7200 // 2 hours

/**
 * Auth security settings
 */
export const AUTH_SETTINGS = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCK_TIME_MS: 600000, // 10 minutes
} as const
