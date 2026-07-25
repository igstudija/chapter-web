import type { Access, FieldAccess, Where } from 'payload'
import { isSuperadminHost, getHostnameFromRequest } from '../lib/hostname'
import { resolveSiteFromHost } from '../lib/resolveSite'

/**
 * MULTISITE SECURITY MODEL (Updated for SiteMemberships)
 *
 * Users now have a separate SiteMemberships collection for site-specific data.
 * A user can have multiple memberships (one per site) with different roles.
 *
 * JWT Token contains:
 * - isSuperadmin: boolean (global superadmin flag)
 * - currentSiteId: string | null (site from login hostname)
 * - currentMembershipId: string | null (membership for current site)
 * - currentRole: 'member-admin' | 'member' | 'superadmin' | null
 * - currentStatus: 'active' | 'blocked' | null
 *
 * Access patterns:
 * 1. Superadmin panel (a NEXT_PUBLIC_SUPERADMIN_HOSTS host): Only Sites/Users visible
 * 2. Chapter sites: Only that site's data via memberships
 */

// Check if current request is from superadmin panel
export const isOnSuperadminPanel = (req: any): boolean => {
  const hostname = getHostnameFromRequest(req)
  return isSuperadminHost(hostname)
}

// Hostname → site ID cache.
//
// Resolved on every access check, every list filter and every site-scoped
// hook — without this cache that's 5-15 redundant `sites` lookups per
// admin request. TTL is short so superadmin edits to Sites propagate
// quickly; negative results (`null`) are also cached so unknown hosts
// don't slam the DB on every probe.
const HOSTNAME_CACHE_TTL_MS = 10_000
type HostnameCacheEntry = { value: string | null; expiresAt: number }
const hostnameCache = new Map<string, HostnameCacheEntry>()

export const invalidateHostnameCache = (hostname?: string): void => {
  if (hostname) {
    hostnameCache.delete(hostname)
  } else {
    hostnameCache.clear()
  }
}

// Get site ID from hostname (for chapter sites only)
export const getSiteIdFromHostname = async (
  hostname: string,
  payload: any,
): Promise<string | null> => {
  // Superadmin hosts have no site context
  if (isSuperadminHost(hostname)) {
    return null
  }

  const cached = hostnameCache.get(hostname)
  const now = Date.now()
  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const { site } = await resolveSiteFromHost(payload, hostname)
  const resolved = site?.id != null ? String(site.id) : null

  hostnameCache.set(hostname, { value: resolved, expiresAt: now + HOSTNAME_CACHE_TTL_MS })
  return resolved
}

// ============================================
// USER HELPER FUNCTIONS
// ============================================

// Check if user is superadmin
export const isUserSuperadmin = (user: any): boolean => {
  return user?.isSuperadmin === true
}

// Check if user is admin in current site
export const isUserAdmin = (user: any): boolean => {
  return user?.isSuperadmin === true || user?.currentRole === 'member-admin'
}

// Check if user is active member in current site
export const isUserActiveMember = (user: any): boolean => {
  if (user?.isSuperadmin) return true
  return user?.currentStatus === 'active'
}

// Get current site ID from user JWT
// IMPORTANT: This uses JWT cached value - may not match current hostname
// For hostname-based lookup, use getEffectiveSiteIdFromRequest
export const getCurrentSiteId = (user: any): string | null => {
  return user?.currentSiteId || null
}

// Get current membership ID from user JWT
export const getCurrentMembershipId = (user: any): string | null => {
  return user?.currentMembershipId || null
}

// Get effective site ID from request hostname
// This is the preferred method when you need accurate site context
// regardless of which site the user originally logged into
export const getEffectiveSiteIdFromRequest = async (req: any): Promise<string | null> => {
  const hostname = getHostnameFromRequest(req)

  // Superadmin panel has no site context
  if (isSuperadminHost(hostname)) {
    return null
  }

  // Get site from hostname
  return getSiteIdFromHostname(hostname, req.payload)
}

// ============================================
// REQUEST-LEVEL MEMBERSHIP CACHE
// ============================================
//
// A single admin list view triggers ~4 access functions (read, baseListFilter,
// update, delete) and each used to fire its own ~200ms `site-memberships`
// query via the Payload SDK. Caching by user+site on the request object
// collapses those into a single lookup per request.
//
// The cache lives on `req` so it dies with the request — no staleness risk.

type MembershipRecord = {
  id: string | number
  role: 'member' | 'member-admin' | string
  status: 'active' | 'blocked' | string
} | null

const MEMBERSHIP_CACHE_KEY = '__membershipCache'

export const getUserMembershipForSite = async (
  req: any,
  siteId: string | number,
): Promise<MembershipRecord> => {
  const userId = req?.user?.id
  if (!userId || !siteId || !req.payload) return null

  const cacheKey = `${userId}:${siteId}`
  const cache: Map<string, MembershipRecord> =
    req[MEMBERSHIP_CACHE_KEY] ?? (req[MEMBERSHIP_CACHE_KEY] = new Map())

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) ?? null
  }

  try {
    const result = await req.payload.find({
      collection: 'site-memberships',
      where: {
        and: [{ user: { equals: userId } }, { site: { equals: siteId } }],
      },
      limit: 1,
      depth: 0,
    })
    const membership = (result.docs[0] as MembershipRecord) ?? null
    cache.set(cacheKey, membership)
    return membership
  } catch {
    cache.set(cacheKey, null)
    return null
  }
}

// ============================================
// ACCESS FUNCTIONS
// ============================================

// Check if user is superadmin
export const isSuperAdmin: Access = ({ req: { user } }) => {
  return isUserSuperadmin(user)
}

// Superadmin or site admin
export const isSuperAdminOrSiteAdmin: Access = ({ req: { user } }) => {
  return isUserAdmin(user)
}

// Site-scoped read access
// On superadmin panel: NO ACCESS (returns false)
// On chapter site: only that site's data
// IMPORTANT: Uses hostname-based site detection to handle multi-site sessions
export const siteScoped: Access = async ({ req }) => {
  const { user } = req
  if (!user) return false

  // On superadmin panel - no content access
  if (isOnSuperadminPanel(req)) {
    return false
  }

  // Superadmin has full access on chapter panels
  if (isUserSuperadmin(user)) {
    return true
  }

  // Always get site from hostname (not JWT) to handle multi-site sessions correctly
  const hostname = getHostnameFromRequest(req)
  const siteId = await getSiteIdFromHostname(hostname, req.payload)
  if (!siteId) return false

  return { site: { equals: siteId } }
}

// Site-scoped access for active members only
// IMPORTANT: Uses hostname-based site detection to handle multi-site sessions
export const siteScopedActiveMember: Access = async ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isOnSuperadminPanel(req)) return false
  if (isUserSuperadmin(user)) return true

  const hostname = getHostnameFromRequest(req)
  const siteId = await getSiteIdFromHostname(hostname, req.payload)
  if (!siteId) return false

  const membership = await getUserMembershipForSite(req, siteId)
  if (!membership || membership.status !== 'active') return false

  return { site: { equals: siteId } }
}

// Site-scoped admin access (superadmin or site admin)
// IMPORTANT: Uses hostname-based site detection to handle multi-site sessions
export const siteScopedAdmin: Access = async ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isOnSuperadminPanel(req)) return false
  if (isUserSuperadmin(user)) return true

  const hostname = getHostnameFromRequest(req)
  const siteId = await getSiteIdFromHostname(hostname, req.payload)
  if (!siteId) return false

  const membership = await getUserMembershipForSite(req, siteId)
  if (!membership || membership.role !== 'member-admin') return false

  return { site: { equals: siteId } }
}

/**
 * Creates a site-scoped access function that allows:
 * - Superadmin: full access
 * - Member-admin: full access to their site's data
 * - Active members: access only to their own entries (where ownerField equals user.id)
 *
 * @param ownerField - The field name that contains the owner user ID (e.g., 'createdBy', 'submittedBy')
 */
export const createSiteScopedAdminOrOwner = (ownerField: string): Access => {
  return async ({ req }) => {
    const { user } = req
    if (!user) return false
    if (isOnSuperadminPanel(req)) return false
    if (isUserSuperadmin(user)) return true

    const hostname = getHostnameFromRequest(req)
    const siteId = await getSiteIdFromHostname(hostname, req.payload)
    if (!siteId) return false

    const membership = await getUserMembershipForSite(req, siteId)
    if (!membership || membership.status !== 'active') return false

    // Admin can update/delete all entries in their site
    if (membership.role === 'member-admin') {
      return { site: { equals: siteId } } as Where
    }

    // Regular members can only update/delete their own entries
    return {
      and: [{ site: { equals: siteId } }, { [ownerField]: { equals: user.id } }],
    } as Where
  }
}

// Site-scoped admin or self (for user profiles/memberships)
// IMPORTANT: Uses hostname-based site detection to handle multi-site sessions
export const siteScopedAdminOrSelf: Access = async ({ req }) => {
  const { user } = req
  if (!user) return false

  // On superadmin panel - only superadmin access
  if (isOnSuperadminPanel(req)) {
    return isUserSuperadmin(user)
  }

  // Superadmin has full access on chapter panels
  if (isUserSuperadmin(user)) {
    return true
  }

  // Get site from hostname
  const hostname = getHostnameFromRequest(req)
  const siteId = await getSiteIdFromHostname(hostname, req.payload)
  if (!siteId) return false

  const membership = await getUserMembershipForSite(req, siteId)
  if (!membership) return false

  // Admin can see all in their site
  if (membership.role === 'member-admin') {
    return { site: { equals: siteId } } as Where
  }

  // Members can only access their own membership
  return { id: { equals: membership.id } } as Where
}

// Published content - public can read, authenticated users see their site's data
// IMPORTANT: Uses hostname-based site detection to handle multi-site sessions
export const siteScopedPublishedOrAuthenticated: Access = async ({ req }) => {
  const { user } = req
  const hostname = getHostnameFromRequest(req)

  // On superadmin panel - no content
  if (isSuperadminHost(hostname)) {
    return false
  }

  if (!user) {
    // Public can see published content (frontend will filter by site)
    return { _status: { equals: 'published' } } as Where
  }

  // Superadmin has full access
  if (isUserSuperadmin(user)) {
    return true
  }

  // Get site from hostname
  const siteId = await getSiteIdFromHostname(hostname, req.payload)
  if (!siteId) return false

  return { site: { equals: siteId } } as Where
}

// ============================================
// FIELD ACCESS
// ============================================

// Field access: only superadmin can change site field
export const siteFieldAccess: FieldAccess = ({ req: { user } }) => {
  return isUserSuperadmin(user)
}

// Field access: superadmin or site admin
export const superadminOrSiteAdminFieldAccess: FieldAccess = ({ req: { user } }) => {
  return isUserAdmin(user)
}

// ============================================
// SITE FIELD HELPER
// ============================================

export const siteField = (options: { required?: boolean } = {}) => ({
  name: 'site',
  type: 'relationship' as const,
  relationTo: 'sites' as const,
  required: options.required ?? true,
  hasMany: false,
  index: true,
  admin: {
    hidden: true,
  },
  access: {
    update: siteFieldAccess,
  },
})

// ============================================
// HOOKS
// ============================================

// Hook to auto-assign site on create (uses hostname)
// Works with both beforeValidate and beforeChange hooks
// IMPORTANT: Always uses hostname-based site detection to handle multi-site sessions
export const autoAssignSiteHook = async ({
  req,
  data,
  operation,
}: {
  req: any
  data?: any
  operation: string
}) => {
  // Initialize data if not provided (beforeValidate may have undefined data)
  const result = data || {}

  if (operation !== 'create') return result

  const user = req.user
  if (!user) return result

  // If site is already set (and not null/empty), don't override
  if (result.site && result.site !== null && result.site !== '') {
    return result
  }

  // On superadmin panel - cannot create content (no site to assign)
  if (isOnSuperadminPanel(req)) {
    return result
  }

  // Always get site from hostname (not JWT) to handle multi-site sessions correctly
  const hostname = getHostnameFromRequest(req)
  const siteId = await getSiteIdFromHostname(hostname, req.payload)

  if (siteId) {
    result.site = siteId
  }

  return result
}

// ============================================
// ADMIN LIST FILTERS
// ============================================

// Base list filter for admin panel
// On superadmin panel: show nothing (for content collections)
// On chapter site: show only that site's data
// IMPORTANT: Always uses hostname-based site detection to handle multi-site sessions
export const siteBasedListFilter = async ({ req }: { req: any }): Promise<Where | null> => {
  const user = req.user
  if (!user) return { id: { equals: 'none' } }

  // On superadmin panel - no content shown
  if (isOnSuperadminPanel(req)) {
    return { id: { equals: 'none' } }
  }

  // Always get site from hostname (not JWT) to handle multi-site sessions correctly
  const hostname = getHostnameFromRequest(req)
  const siteId = await getSiteIdFromHostname(hostname, req.payload)

  if (!siteId) return { id: { equals: 'none' } }

  return { site: { equals: siteId } }
}

// Special list filter for Users collection
// On superadmin panel: show all users
// On chapter site: show users with membership in that site
// IMPORTANT: Always uses hostname-based site detection to handle multi-site sessions
export const usersListFilter = async ({ req }: { req: any }): Promise<Where | null> => {
  const user = req.user
  if (!user) return { id: { equals: 'none' } }

  // On superadmin panel - show all users (for superadmin only)
  if (isOnSuperadminPanel(req)) {
    if (isUserSuperadmin(user)) {
      return {} // Show all
    }
    return { id: { equals: 'none' } }
  }

  // Always get site from hostname (not JWT) to handle multi-site sessions correctly
  const hostname = getHostnameFromRequest(req)
  const siteId = await getSiteIdFromHostname(hostname, req.payload)

  if (!siteId) return { id: { equals: 'none' } }

  // Find all memberships for this site and return those user IDs
  try {
    const memberships = await req.payload.find({
      collection: 'site-memberships',
      where: { site: { equals: siteId } },
      limit: 1000,
    })

    const userIds = memberships.docs.map((m: any) =>
      typeof m.user === 'object' ? m.user.id : m.user,
    )

    if (userIds.length === 0) {
      return { id: { equals: 'none' } }
    }

    return { id: { in: userIds } }
  } catch {
    return { id: { equals: 'none' } }
  }
}

// List filter for SiteMemberships collection
// IMPORTANT: Always uses hostname-based site detection to handle multi-site sessions
export const membershipsListFilter = async ({ req }: { req: any }): Promise<Where | null> => {
  const user = req.user
  if (!user) return { id: { equals: 'none' } }

  // On superadmin panel - show all memberships (for superadmin only)
  if (isOnSuperadminPanel(req)) {
    if (isUserSuperadmin(user)) {
      return {} // Show all
    }
    return { id: { equals: 'none' } }
  }

  // Always get site from hostname (not JWT) to handle multi-site sessions correctly
  const hostname = getHostnameFromRequest(req)
  const siteId = await getSiteIdFromHostname(hostname, req.payload)

  if (!siteId) return { id: { equals: 'none' } }

  return { site: { equals: siteId } }
}

// Export for backwards compatibility
export const getEffectiveSiteId = getCurrentSiteId
export const getUserSiteId = getCurrentSiteId

// ============================================
// RELATIONSHIP FILTER OPTIONS
// ============================================

/**
 * Filter users by site memberships for relationship fields
 * Only shows users who have active memberships in the current site
 */
export const filterUsersBySiteMemberships = async ({ req }: { req: any }): Promise<Where> => {
  const user = req.user
  if (!user) return { id: { equals: 'none' } }

  // On superadmin panel - show all users (for superadmin only)
  if (isOnSuperadminPanel(req)) {
    if (isUserSuperadmin(user)) {
      return {} // Show all
    }
    return { id: { equals: 'none' } }
  }

  // Always get site from hostname (not JWT) to handle multi-site sessions correctly
  const hostname = getHostnameFromRequest(req)
  const siteId = await getSiteIdFromHostname(hostname, req.payload)

  if (!siteId) return { id: { equals: 'none' } }

  // Find all active memberships for this site and return those user IDs
  try {
    const memberships = await req.payload.find({
      collection: 'site-memberships',
      where: {
        and: [{ site: { equals: siteId } }, { status: { equals: 'active' } }],
      },
      limit: 1000,
    })

    const userIds = memberships.docs.map((m: any) =>
      typeof m.user === 'object' ? m.user.id : m.user,
    )

    if (userIds.length === 0) {
      return { id: { equals: 'none' } }
    }

    return { id: { in: userIds } }
  } catch {
    return { id: { equals: 'none' } }
  }
}

// ============================================
// SITE-SCOPED SLUG VALIDATION
// ============================================

/**
 * Creates a site-scoped slug validation function.
 * Ensures slug is unique only within the same site, not globally.
 *
 * @param collectionSlug - The collection slug to check for duplicates
 * @returns Validation function for Payload field
 */
export const createSiteScopedSlugValidation = (collectionSlug: string) => {
  return async (
    value: string | undefined | null,
    { req, data, id }: { req: any; data?: any; id?: string | number },
  ): Promise<string | true> => {
    if (!value) return true // Let required validation handle empty values

    const payload = req.payload
    if (!payload) return true

    // Get site ID from data or from hostname
    let siteId = data?.site
    if (!siteId && req) {
      const hostname = getHostnameFromRequest(req)
      if (!isSuperadminHost(hostname)) {
        siteId = await getSiteIdFromHostname(hostname, payload)
      }
    }

    // If no site context, can't validate uniqueness within site
    if (!siteId) return true

    // Extract site ID if it's an object
    const siteIdValue = typeof siteId === 'object' ? siteId.id : siteId

    // Check for existing documents with same slug in the same site
    const existing = await payload.find({
      collection: collectionSlug,
      where: {
        and: [{ slug: { equals: value } }, { site: { equals: siteIdValue } }],
      },
      limit: 1,
    })

    // If we found a document and it's not the current one being edited
    if (existing.docs.length > 0) {
      const existingId = existing.docs[0].id
      if (String(existingId) !== String(id)) {
        return 'This slug is already in use within this site. Please choose a different one.'
      }
    }

    return true
  }
}
