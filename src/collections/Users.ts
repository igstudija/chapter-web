import type { CollectionConfig, Access, Where } from 'payload'
import { adminFieldAccess, isAdmin } from '../access'

/**
 * Users — authentication and authorisation.
 *
 * Who a member *is* lives in `members`; this is how they sign in and what they
 * are allowed to do. `role` and `status` sit here rather than on the profile
 * because access control reads them on every request: keeping them on the user
 * record puts them in the JWT, so a permission check costs nothing.
 *
 * There was a second layer here once — `adminHostname`, `currentSiteId`,
 * `currentMembershipId`, `currentRole`, `currentStatus` — written at login by a
 * hook that resolved the request's hostname to an organisation and looked up
 * the membership held in it. One organisation means none of that has anything
 * to resolve.
 */

/** Administrators see every account; everyone else only their own. */
const adminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user)) return true
  return { id: { equals: user.id } } as Where
}

const adminOnly: Access = ({ req: { user } }) => isAdmin(user)

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'surname', 'email', 'role', 'status'],
    listSearchableFields: ['name', 'surname', 'email'],
    group: 'System',
    description: 'Login accounts. Profile details live under Members.',
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
    admin: ({ req: { user } }) => isAdmin(user),
    read: adminOrSelf,
    create: adminOnly,
    update: adminOrSelf,
    delete: adminOnly,
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
    ],
    beforeLogin: [
      // A blocked account keeps its record and its history but cannot sign in.
      async ({ user }) => {
        if (user.status === 'blocked') {
          throw new Error('This account has been blocked. Please contact an administrator.')
        }
        return user
      },
    ],
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

    // === ROLE AND STATUS ===
    // Both are saved to the JWT: every access check reads them, and a database
    // lookup per check is what the previous multi-tenant model did.
    {
      type: 'row',
      fields: [
        {
          name: 'role',
          type: 'select',
          defaultValue: 'member',
          required: true,
          index: true,
          options: [
            { label: 'Member', value: 'member' },
            { label: 'Member + Admin', value: 'member-admin' },
          ],
          access: { update: adminFieldAccess },
          saveToJWT: true,
        },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'active',
          required: true,
          index: true,
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Blocked', value: 'blocked' },
          ],
          access: { update: adminFieldAccess },
          saveToJWT: true,
        },
      ],
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

  ],
}
