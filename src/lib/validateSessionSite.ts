import { getSiteFromHost } from './getSiteFromHost'

/**
 * Validates that the user's session site matches the current hostname.
 * Returns true if valid, false if there's a mismatch.
 *
 * This prevents users logged into Site A from performing actions on Site B.
 */
export async function isSessionValidForCurrentSite(
  user: any,
  host: string | null,
): Promise<boolean> {
  // No user = no session to validate
  if (!user) return true

  // Superadmins can access any site
  if (user.isSuperadmin) return true

  // Get site ID from current hostname
  const currentSite = await getSiteFromHost(host)
  const currentSiteId = currentSite?.id ? String(currentSite.id) : null

  // No site found for hostname = allow (might be localhost or superadmin panel)
  if (!currentSiteId) return true

  // Get site ID from user's session (stored in JWT)
  const sessionSiteId = user.currentSiteId ? String(user.currentSiteId) : null

  // If session has no site context, it's invalid for site-specific pages
  if (!sessionSiteId) return false

  // Check if session site matches current site
  return sessionSiteId === currentSiteId
}
