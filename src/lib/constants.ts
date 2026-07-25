/**
 * Centralized configuration constants
 * Single source of truth for environment-specific values
 */

/**
 * Hostnames that serve the cross-organisation superadmin panel.
 *
 * Set `NEXT_PUBLIC_SUPERADMIN_HOSTS` to a comma-separated list, e.g.
 *
 *     NEXT_PUBLIC_SUPERADMIN_HOSTS=admin.example.com,admin.localhost
 *
 * Any host NOT in this list resolves to a single organisation by domain (see
 * `getSiteFromHost`), so adding a host here takes it out of tenant routing.
 *
 * The `NEXT_PUBLIC_` prefix is required, not incidental: the admin role picker
 * (`components/admin/RoleSelect.tsx`) runs in the browser and needs the same
 * list. A hostname list is not a secret — it is in the address bar already —
 * and having one variable rather than a server/client pair is what keeps
 * middleware, server code and client code from drifting apart.
 *
 * Defaults to `admin.localhost` so a fresh checkout has a reachable superadmin
 * panel at http://admin.localhost:3050/admin without any configuration.
 */
export const SUPERADMIN_HOSTS: string[] = (
  process.env.NEXT_PUBLIC_SUPERADMIN_HOSTS || 'admin.localhost'
)
  .split(',')
  // Tolerate a port in the configured value; comparisons always strip it.
  .map((host) => host.trim().split(':')[0].toLowerCase())
  .filter(Boolean)

/**
 * Check if a hostname is a superadmin panel host.
 * Accepts hostnames with or without a port (e.g. 'admin.localhost:3050').
 */
export const isSuperadminHost = (hostname: string): boolean => {
  const hostnameWithoutPort = hostname.split(':')[0].toLowerCase()
  return SUPERADMIN_HOSTS.includes(hostnameWithoutPort)
}

/**
 * First configured superadmin host.
 *
 * Server-side jobs that call into site-scoped code (tag generation, scripts)
 * synthesise a request with this as the `host` header so that access control
 * sees a superadmin context instead of resolving to some arbitrary tenant.
 */
export const PRIMARY_SUPERADMIN_HOST = SUPERADMIN_HOSTS[0] || 'admin.localhost'

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
