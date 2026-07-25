import type { Access, FieldAccess } from 'payload'
import { isUserAdmin, isUserActiveMember, isUserSuperadmin } from './multisite'

// Anyone can access
export const anyone: Access = () => true

// Only authenticated users
export const authenticated: Access = ({ req: { user } }) => Boolean(user)

// Only active members (not blocked) - uses new membership-based status
export const activeMember: Access = ({ req: { user } }) => {
  if (!user) return false
  // Superadmin is always considered active
  if (isUserSuperadmin(user)) return true
  // Check currentStatus from JWT (set during login from membership)
  return user.currentStatus === 'active'
}

// Admin only - uses new membership-based role
export const adminOnly: Access = ({ req: { user } }) => {
  return isUserAdmin(user)
}

// Admin or self (for user profile access)
export const adminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isUserAdmin(user)) return true
  return { id: { equals: user.id } }
}

// Active members can read other active members
export const activeMembersCanRead: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isUserAdmin(user)) return true
  if (isUserActiveMember(user)) return true
  return { id: { equals: user.id } }
}

// Published content or authenticated user
export const publishedOrAuthenticated: Access = ({ req: { user } }) => {
  if (user) return true
  return { _status: { equals: 'published' } }
}

// Field access: admin only
export const adminFieldAccess: FieldAccess = ({ req: { user } }) => {
  return isUserAdmin(user)
}
