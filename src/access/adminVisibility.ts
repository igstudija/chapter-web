/**
 * Admin Visibility Helpers
 *
 * Controls which collections are visible in Payload admin panel
 * based on user.adminHostname stored in JWT during login.
 *
 * SUPERADMIN PANEL (any NEXT_PUBLIC_SUPERADMIN_HOSTS entry, e.g. admin.localhost):
 *   - Shows ONLY: Sites, Users (superadmin only)
 *   - Hides: All content collections
 *
 * ORGANISATION PANELS (a Sites.domain value, or <slug>.localhost in dev):
 *   - Shows: All content collections for that site
 *   - Hides: Sites collection
 *
 * NOTE: We use user.adminHostname from JWT which is set during login.
 * Next.js 15 requires async headers() which doesn't work in Payload admin conditions.
 */
import { isSuperadminHost } from '../lib/constants'

/**
 * Get hostname from user's JWT (set during login)
 * Strips port number if present
 */
const getHostnameFromUser = (user: any): string | null => {
  if (!user?.adminHostname) return null
  return user.adminHostname.split(':')[0] || null
}

/**
 * Hide collection on superadmin panel
 * Use for: Media, Events, Blog, Pages, all Settings collections, etc.
 * Returns: true = hidden, false = visible
 */
export const hideOnSuperadminPanel = ({ user }: { user: any }): boolean => {
  const hostname = getHostnameFromUser(user)

  // If no hostname available, default to showing (safety during initial load)
  if (!hostname) return false
  return isSuperadminHost(hostname)
}

/**
 * Show collection ONLY on superadmin panel
 * Use for: Sites collection
 * Returns: true = hidden, false = visible
 */
export const showOnlyOnSuperadminPanel = ({ user }: { user: any }): boolean => {
  const hostname = getHostnameFromUser(user)

  // If no hostname available, hide Sites by default (chapter users shouldn't see it)
  if (!hostname) return true
  return !isSuperadminHost(hostname)
}

/**
 * Special visibility for Users collection on superadmin panel
 * Shows Users on superadmin panel BUT only superadmin users
 * This function just controls visibility - actual filtering is in access control
 */
export const hideUsersOnSuperadminPanel = (): boolean => {
  // Users collection is visible on both panels
  // But access control will filter what's shown
  return false
}

/**
 * Hide Activities collections (OneToOneMeetings, Referrals) when:
 * 1. On superadmin panel (no site context)
 * 2. On chapter panel where enableActivities is false
 *
 * Uses user.siteEnableActivities which is set during login and saved to JWT
 */
export const hideActivitiesCollection = ({ user }: { user: any }): boolean => {
  const hostname = getHostnameFromUser(user)

  // Always hide on superadmin panel (no site context for activities)
  if (hostname && isSuperadminHost(hostname)) {
    return true
  }

  // Check siteEnableActivities from user's JWT (set during login)
  if (user?.siteEnableActivities === true) {
    return false // Show activities - enableActivities is true for this site
  }

  // Default: hide activities (safer when we can't verify)
  return true
}
