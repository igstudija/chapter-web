/**
 * Hostname utilities for multi-tenant site detection
 * Centralized logic for extracting and validating hostnames
 */

import { SUPERADMIN_HOSTS, isSuperadminHost } from './constants'

// Re-export for convenience
export { SUPERADMIN_HOSTS, isSuperadminHost }

/**
 * Extract hostname from request headers
 * Handles both Next.js Headers API and plain objects
 */
export const getHostnameFromRequest = (req: {
  headers?: { get?: (name: string) => string | null; host?: string }
}): string => {
  const host = req.headers?.get?.('host') || req.headers?.host || ''
  return host.split(':')[0]
}

/**
 * Extract hostname with port from request headers
 */
export const getHostWithPort = (req: {
  headers?: { get?: (name: string) => string | null; host?: string }
}): string => {
  return req.headers?.get?.('host') || req.headers?.host || ''
}

/**
 * Check if running on localhost
 */
export const isLocalhost = (hostname: string): boolean => {
  return hostname.endsWith('.localhost') || hostname === 'localhost'
}

/**
 * Extract subdomain from localhost hostname
 * e.g., "riga.localhost" -> "riga"
 */
export const getSubdomainFromLocalhost = (hostname: string): string | null => {
  if (!hostname.endsWith('.localhost')) return null
  const subdomain = hostname.replace('.localhost', '')
  return subdomain || null
}

/**
 * Development logging utility
 * Only logs in development environment
 */
export const devLog = (prefix: string, ...args: unknown[]): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${prefix}]`, ...args)
  }
}

/**
 * Development error logging utility
 * Only logs in development environment
 */
export const devError = (prefix: string, ...args: unknown[]): void => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${prefix}]`, ...args)
  }
}
