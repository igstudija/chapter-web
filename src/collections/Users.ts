import type { CollectionConfig, Access, Where } from 'payload'
import { isOnSuperadminPanel, usersListFilter } from '../access/multisite'
import { showOnlyOnSuperadminPanel } from '../access/adminVisibility'
import { isSuperadminHost } from '../lib/constants'
import { getHostnameFromRequest, devLog, devError } from '../lib/hostname'
import { resolveSiteFromHost } from '../lib/resolveSite'

// Shared access check for admins
const isAdminUser = (user: any): boolean => {
  return user?.isSuperadmin === true || user?.currentRole === 'member-admin'
}

// Users read/update access
const usersReadOrUpdateAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isAdminUser(user)) return true
  return { id: { equals: user.id } } as Where
}

// Users create/delete access - only admins
const usersAdminOnlyAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  return isAdminUser(user)
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'surname', 'email', 'isSuperadmin'],
    listSearchableFields: ['name', 'surname', 'email'],
    group: 'System',
    description: 'Global user accounts (login credentials)',
    // Only visible on superadmin panel - chapter admins manage members via Site Memberships
    hidden: showOnlyOnSuperadminPanel,
    baseListFilter: usersListFilter,
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  auth: {
    tokenExpiration: 7200,
    verify: false,
    maxLoginAttempts: 5,
    lockTime: 600000,
  },
  access: {
    // Superadmin and site admin can access admin panel
    admin: ({ req: { user } }) =>
      user?.isSuperadmin === true || user?.currentRole === 'member-admin',
    read: usersReadOrUpdateAccess,
    create: usersAdminOnlyAccess,
    update: usersReadOrUpdateAccess,
    delete: usersAdminOnlyAccess,
  },
  hooks: {
    beforeChange: [
      // Lowercase email fields
      async ({ data }) => {
        if (data?.email && typeof data.email === 'string') {
          data.email = data.email.toLowerCase().trim()
        }
        if (data?.pendingEmail && typeof data.pendingEmail === 'string') {
          data.pendingEmail = data.pendingEmail.toLowerCase().trim()
        }
        return data
      },
      // Prevent creating/changing to superadmin on chapter sites
      async ({ req, data, operation, context }) => {
        if (!data) return data

        // Only check if isSuperadmin is being set to true
        if (data.isSuperadmin !== true) return data

        // Allow when overrideAccess is true (e.g., from CLI scripts)
        // Check multiple places where Payload might store this flag
        if (
          req.context?.overrideAccess ||
          context?.overrideAccess ||
          (req as any).payloadAPI === 'local'
        ) {
          return data
        }

        // Allow on superadmin panel
        if (isOnSuperadminPanel(req)) return data

        // Block superadmin creation on chapter sites
        throw new Error(
          'Superadmin users can only be created on the superadmin panel',
        )
      },
    ],
    beforeLogin: [
      // CRITICAL: This hook runs BEFORE JWT token generation
      // We must save context fields to DB here so they get included in the JWT token
      // (saveToJWT reads from DB, not from hook return values)
      async ({ req, user }) => {
        const host = req.headers.get('host') || ''
        const hostname = host.split(':')[0]

        devLog('beforeLogin', '====== LOGIN HOOK START ======')
        devLog('beforeLogin', 'Host:', host)

        // If no host header, this is an internal call from custom login endpoint
        // Context fields are already set in DB, skip duplicate checks
        if (!host) {
          devLog('beforeLogin', 'Internal call (no host) - context already set, skipping checks')
          return user
        }
        devLog('beforeLogin', 'User ID:', user.id)
        devLog('beforeLogin', 'User email:', user.email)
        devLog('beforeLogin', 'Is superadmin:', user.isSuperadmin)

        const isSuperadminPanel = isSuperadminHost(hostname)
        devLog('beforeLogin', 'Is superadmin host:', isSuperadminPanel)

        // For non-superadmin users, find their membership in the current site
        let currentSiteId: string | null = null
        let siteEnableActivities = false

        if (!isSuperadminPanel) {
          // Same resolver the access layer and login route use, so the site
          // stored in the JWT matches the one requests get scoped to.
          try {
            const { site } = await resolveSiteFromHost(req.payload, hostname)
            currentSiteId = site?.id != null ? String(site.id) : null
            siteEnableActivities = site?.enableActivities || false
          } catch {
            // Leave unscoped rather than blocking login.
          }
        }

        devLog('beforeLogin', 'Current site ID:', currentSiteId)

        // Find user's membership in this site
        let membership = null
        if (currentSiteId) {
          try {
            const memberships = await req.payload.find({
              collection: 'site-memberships',
              where: {
                user: { equals: user.id },
                site: { equals: currentSiteId },
              },
              limit: 1,
            })
            membership = memberships.docs[0] || null
          } catch (e) {
            devError('beforeLogin', 'Error finding membership:', e)
          }
        }

        devLog('beforeLogin', 'Membership found:', membership?.id)

        // If no membership and not on superadmin panel
        if (!membership && !isSuperadminPanel) {
          // Superadmin can still access without membership (but won't have profile)
          if (user.isSuperadmin) {
            devLog('beforeLogin', 'Superadmin without membership - can admin but no profile')
          } else {
            devLog('beforeLogin', 'No membership found - denying login')
            throw new Error(
              'You are not a member of this chapter. Please contact the administrator.',
            )
          }
        }

        // If membership is blocked, deny login (except superadmin)
        if (membership?.status === 'blocked' && !user.isSuperadmin) {
          devLog('beforeLogin', 'Membership is blocked - denying login')
          throw new Error(
            'Your membership in this chapter is blocked. Please contact the administrator.',
          )
        }

        // Determine the effective role
        const effectiveRole = user.isSuperadmin ? 'superadmin' : membership?.role || null

        // Save context fields to database BEFORE JWT generation
        // This is critical - saveToJWT reads from DB at token generation time
        const membershipId = membership?.id ? String(membership.id) : null
        try {
          await req.payload.update({
            collection: 'users',
            id: user.id,
            data: {
              adminHostname: host,
              currentSiteId: currentSiteId,
              currentMembershipId: membershipId,
              currentRole: effectiveRole,
              currentStatus: membership?.status || (user.isSuperadmin ? 'active' : null),
              siteEnableActivities: siteEnableActivities,
            },
          })
          devLog('beforeLogin', 'Context fields saved to database (before JWT generation)')
        } catch (e) {
          devError('beforeLogin', 'Error saving context fields:', e)
        }

        devLog('beforeLogin', '====== LOGIN HOOK END ======')

        // Return modified user (Payload will use this for JWT generation)
        return {
          ...user,
          adminHostname: host,
          currentSiteId: currentSiteId,
          currentMembershipId: membershipId,
          currentRole: effectiveRole,
          currentStatus: membership?.status || (user.isSuperadmin ? 'active' : null),
          siteEnableActivities: siteEnableActivities,
        }
      },
    ],
    // afterLogin is no longer needed - all logic moved to beforeLogin
    // to ensure context fields are saved to DB before JWT token generation
  },
  fields: [
    // === BASIC INFO (Global) ===
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          index: true,
        },
        {
          name: 'surname',
          type: 'text',
          required: true,
          index: true,
        },
      ],
    },
    // email is automatic from auth

    // === SUPERADMIN FLAG ===
    {
      name: 'isSuperadmin',
      type: 'checkbox',
      defaultValue: false,
      label: 'Superadmin',
      admin: {
        description: 'Global administrator with access to all sites',
        // Only visible on superadmin panel - multisite admins cannot see or change this
        condition: () => {
          if (typeof window === 'undefined') return false
          const hostname = window.location.hostname
          return isSuperadminHost(hostname)
        },
      },
      access: {
        // Only superadmin on superadmin panel can change this
        update: ({ req }) => req.user?.isSuperadmin === true && isOnSuperadminPanel(req),
      },
      saveToJWT: true,
    },

    // === HIDDEN FIELDS FOR AUTH CONTEXT ===
    {
      name: 'customResetToken',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'customResetExpiry',
      type: 'date',
      admin: { hidden: true },
    },
    {
      name: 'magicLinkToken',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'magicLinkExpiry',
      type: 'date',
      admin: { hidden: true },
    },

    // === EMAIL CHANGE VERIFICATION FIELDS ===
    {
      name: 'pendingEmail',
      type: 'email',
      admin: { hidden: true },
    },
    {
      name: 'emailChangeToken',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'emailChangeExpiry',
      type: 'date',
      admin: { hidden: true },
    },

    // === JWT CONTEXT FIELDS (set during login via beforeLogin hook) ===
    // These are saved to JWT token for session context
    {
      name: 'adminHostname',
      type: 'text',
      admin: { hidden: true },
      saveToJWT: true,
    },
    {
      name: 'currentSiteId',
      type: 'text',
      admin: { hidden: true },
      saveToJWT: true,
    },
    {
      name: 'currentMembershipId',
      type: 'text',
      admin: { hidden: true },
      saveToJWT: true,
    },
    {
      name: 'currentRole',
      type: 'text',
      admin: { hidden: true },
      saveToJWT: true,
    },
    {
      name: 'currentStatus',
      type: 'text',
      admin: { hidden: true },
      saveToJWT: true,
    },
    {
      name: 'siteEnableActivities',
      type: 'checkbox',
      defaultValue: false,
      admin: { hidden: true },
      saveToJWT: true,
    },
  ],
}
