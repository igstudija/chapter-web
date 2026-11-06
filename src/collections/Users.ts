import { APIError, ValidationError, type CollectionConfig, type Access, type Where } from 'payload'
import { adminFieldAccess, isAdmin } from '../access'
import { isRetiredPassword } from '../lib/retiredPasswords'

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
    beforeValidate: [
      // A password everyone can read in the source is not a password. See
      // lib/retiredPasswords.ts.
      ({ data }) => {
        if (isRetiredPassword(data?.password)) {
          throw new ValidationError({
            collection: 'users',
            errors: [
              {
                path: 'password',
                message: 'This password was published as a default and cannot be used. Choose another.',
              },
            ],
          })
        }
        return data
      },
    ],
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
    afterChange: [
      // A member renaming themselves on their profile page writes this record
      // only. Carry the name to their member profile, which is what the admin
      // lists, the slideshow and every member picker show. The reverse
      // direction lives in Members' beforeChange; each tells the other through
      // `context` so neither writes the change straight back.
      async ({ doc, previousDoc, operation, req, context }) => {
        if (operation !== 'update' || context?.syncingNameFromMember) return doc
        if (doc.name === previousDoc?.name && doc.surname === previousDoc?.surname) return doc

        const { docs } = await req.payload.find({
          collection: 'members',
          where: { user: { equals: doc.id } },
          limit: 1,
          depth: 0,
        })
        const member = docs[0]
        if (!member || (member.name === doc.name && member.surname === doc.surname)) return doc

        await req.payload.update({
          collection: 'members',
          id: member.id,
          data: { name: doc.name, surname: doc.surname },
          depth: 0,
          context: { syncingNameFromUser: true },
        })
        return doc
      },
    ],
    beforeDelete: [
      // An MCP key acts as its owner and cannot outlive them: its `user`
      // column is NOT NULL, so the delete would otherwise fail on it.
      async ({ req, id }) => {
        await req.payload.delete({
          collection: 'payload-mcp-api-keys',
          where: { user: { equals: id } },
          overrideAccess: true,
          req,
        })
      },
    ],
    beforeLogin: [
      // Payload's own sign-in (the admin panel, /api/users/login) checks the
      // password before this runs, so an account still holding a retired
      // password would get in. Refuse it here; /api/auth/login refuses it
      // before asking Payload at all.
      async ({ req, user }) => {
        if (isRetiredPassword((req.data as { password?: unknown } | undefined)?.password)) {
          // 401 and public, so the admin's sign-in form shows the reason
          // rather than "Something went wrong".
          throw new APIError(
            'This password is no longer accepted: it was a published default. Reset it with "Forgot password".',
            401,
            null,
            true,
          )
        }
        return user
      },
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
    //
    // `hidden: true` on the field, not only `admin.hidden`. The admin flag
    // hides a field from the edit form and nothing else: these tokens were
    // returned by every read of a user — the REST API to any signed-in member,
    // and the public /contacts page, which serialised its contact persons'
    // user records (magicLinkToken included) into the HTML. A magic-link token
    // read off a public page is a login as that person. Hidden fields never
    // leave the server; the routes that need one ask with showHiddenFields.
    {
      name: 'customResetToken',
      type: 'text',
      hidden: true,
    },
    {
      name: 'customResetExpiry',
      type: 'date',
      hidden: true,
    },
    {
      name: 'magicLinkToken',
      type: 'text',
      hidden: true,
    },
    {
      name: 'magicLinkExpiry',
      type: 'date',
      hidden: true,
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
      hidden: true,
    },
    {
      name: 'emailChangeExpiry',
      type: 'date',
      hidden: true,
    },

  ],
}
