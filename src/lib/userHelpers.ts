/**
 * User helpers.
 *
 * `role` and `status` are fields on the User record and travel in the JWT, so
 * these are plain reads. They used to be `currentRole` / `currentStatus`:
 * per-request copies of the membership the user held in whichever organisation
 * the hostname resolved to, written into the token at login. With one
 * organisation there is nothing to resolve and nothing to cache.
 */

import type { User } from '@/payload-types'

/**
 * Kept as a distinct name because most of the app imports it, but a user now
 * carries its own role and status — there is no separate request context.
 */
export type UserWithContext = User

/** Administers the install. */
export const isUserAdmin = (user: UserWithContext | null | undefined): boolean =>
  user?.role === 'member-admin'

/** A member in good standing. Administrators always count as active. */
export const isUserActive = (user: UserWithContext | null | undefined): boolean => {
  if (!user) return false
  return isUserAdmin(user) || user.status === 'active'
}

/** Get user's full name */
export const getUserFullName = (
  user: { name?: string | null; surname?: string | null } | null | undefined,
): string => {
  if (!user) return ''
  return [user.name, user.surname].filter(Boolean).join(' ')
}

/**
 * The member profile belonging to a user.
 *
 * One record per user now, so the lookup is by user alone; it used to need the
 * site as well, since a person could hold one profile per organisation.
 */
export const getUserMembership = async (payload: any, userId: string | number) => {
  const memberships = await payload.find({
    collection: 'members',
    where: { user: { equals: userId } },
    limit: 1,
    depth: 1,
  })
  return memberships.docs[0] || null
}

/** The signed-in user's own member profile. */
export const getCurrentUserMembership = async (payload: any, user: UserWithContext) => {
  if (!user?.id) return null
  return getUserMembership(payload, user.id)
}
