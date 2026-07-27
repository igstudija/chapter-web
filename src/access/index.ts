import type { Access, FieldAccess } from 'payload'

/**
 * Access control for a single-organisation install.
 *
 * One organisation, one Payload, two roles that matter: `member-admin`
 * administers the install, `member` takes part in it. Both `role` and `status`
 * live on the User record and travel in the JWT, so an access check is a field
 * comparison rather than a database round trip.
 *
 * This replaced a host-based multi-tenant model where every check first
 * resolved the request's hostname to an organisation and then looked up the
 * user's membership in it. Nothing here is site-scoped any more: if a user is
 * an active member, they are a member of *the* organisation.
 */

/** Administers the install. Named for the value stored on the record. */
export const isAdmin = (user: unknown): boolean =>
  (user as { role?: string } | null)?.role === 'member-admin'

/** A member in good standing — not blocked. */
export const isActiveMember = (user: unknown): boolean => {
  const u = user as { role?: string; status?: string } | null
  if (!u) return false
  return isAdmin(u) || u.status === 'active'
}

// ============================================================================
// COLLECTION ACCESS
// ============================================================================

/** Public. */
export const anyone: Access = () => true

/** Any logged-in user, blocked or not. */
export const authenticated: Access = ({ req: { user } }) => Boolean(user)

/** Logged in and not blocked. The default for member-facing content. */
export const activeMember: Access = ({ req: { user } }) => isActiveMember(user)

/** Administrators only. */
export const adminOnly: Access = ({ req: { user } }) => isAdmin(user)

/** Administrators see everything; everyone else sees only their own record. */
export const adminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user)) return true
  return { id: { equals: user.id } }
}

/** Active members may read each other; a blocked user sees only themselves. */
export const activeMembersCanRead: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isActiveMember(user)) return true
  return { id: { equals: user.id } }
}

/** Anonymous visitors see published documents; logged-in users see drafts too. */
export const publishedOrAuthenticated: Access = ({ req: { user } }) => {
  if (user) return true
  return { _status: { equals: 'published' } }
}

/**
 * Administrators may act on any document; members only on the ones they own.
 *
 * `ownerField` is the relationship holding the author — `submittedBy`,
 * `requestedBy`, `author`, depending on the collection.
 */
export const createAdminOrOwner = (ownerField: string): Access => {
  return ({ req: { user } }) => {
    if (!user) return false
    if (isAdmin(user)) return true
    return { [ownerField]: { equals: user.id } }
  }
}

// ============================================================================
// RELATIONSHIP FILTERS
// ============================================================================

/**
 * Restricts a relationship picker to members in good standing.
 *
 * This replaced a filter that listed the users holding a membership in the
 * request's organisation. With one organisation the only thing left worth
 * filtering on is whether the account is blocked — a blocked member should not
 * be selectable as the counterpart of a new record.
 */
export const activeUsersFilter = () => ({ status: { equals: 'active' } })

// ============================================================================
// FIELD ACCESS
// ============================================================================

/** Fields only an administrator may change (roles, status, ownership). */
export const adminFieldAccess: FieldAccess = ({ req: { user } }) => isAdmin(user)

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Slug uniqueness across a collection.
 *
 * Previously uniqueness only had to hold within one organisation, since two
 * organisations could each have their own `/about`. With a single install a
 * slug is a URL and a URL is unique, so the check is now a plain global one.
 */
export const createUniqueSlugValidation = (collectionSlug: string) => {
  return async (
    value: string | undefined | null,
    { req, id }: { req: any; data?: any; id?: string | number },
  ): Promise<string | true> => {
    if (!value) return true // `required` handles empty values

    const payload = req?.payload
    if (!payload) return true

    const existing = await payload.find({
      collection: collectionSlug,
      where: { slug: { equals: value } },
      limit: 1,
      depth: 0,
    })

    if (existing.docs.length > 0 && String(existing.docs[0].id) !== String(id)) {
      return 'This slug is already in use. Please choose a different one.'
    }

    return true
  }
}
