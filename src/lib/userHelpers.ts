/**
 * User Helper Functions
 *
 * Helper functions for working with the new User + SiteMembership structure.
 * These helpers work with the JWT token data set during login.
 */

import type { User } from '@/payload-types'

// Extended user type with JWT context fields
export interface UserWithContext extends User {
  currentSiteId?: string | null
  currentMembershipId?: string | null
  currentRole?: 'member-admin' | 'member' | 'superadmin' | null
  currentStatus?: 'active' | 'blocked' | null
  siteEnableActivities?: boolean
}

/**
 * Check if user is a superadmin
 */
export const isUserSuperadmin = (user: UserWithContext | null | undefined): boolean => {
  return user?.isSuperadmin === true
}

/**
 * Check if user is admin in current site (superadmin or member-admin)
 */
export const isUserAdmin = (user: UserWithContext | null | undefined): boolean => {
  if (!user) return false
  if (user.isSuperadmin) return true
  return user.currentRole === 'member-admin'
}

/**
 * Check if user is active member in current site
 */
export const isUserActive = (user: UserWithContext | null | undefined): boolean => {
  if (!user) return false
  if (user.isSuperadmin) return true
  return user.currentStatus === 'active'
}

/**
 * Get user's current site ID from JWT
 */
export const getCurrentSiteId = (user: UserWithContext | null | undefined): string | null => {
  return user?.currentSiteId || null
}

/**
 * Get user's current membership ID from JWT
 */
export const getCurrentMembershipId = (user: UserWithContext | null | undefined): string | null => {
  return user?.currentMembershipId || null
}

/**
 * Get user's full name
 */
export const getUserFullName = (user: { name?: string | null; surname?: string | null } | null | undefined): string => {
  if (!user) return ''
  return [user.name, user.surname].filter(Boolean).join(' ')
}

/**
 * Get user's membership for a specific site
 * Used in frontend pages to fetch profile data
 */
export const getUserMembership = async (
  payload: any,
  userId: string,
  siteId: string,
) => {
  const memberships = await payload.find({
    collection: 'site-memberships',
    where: {
      user: { equals: userId },
      site: { equals: siteId },
    },
    limit: 1,
    depth: 1,
  })
  return memberships.docs[0] || null
}

/**
 * Get current user's membership using JWT context
 * Used in frontend pages where user is already authenticated
 */
export const getCurrentUserMembership = async (
  payload: any,
  user: UserWithContext,
) => {
  const membershipId = user.currentMembershipId
  if (!membershipId) return null

  try {
    const membership = await payload.findByID({
      collection: 'site-memberships',
      id: membershipId,
      depth: 1,
    })
    return membership
  } catch {
    return null
  }
}
