import type { CollectionConfig, Access, Where, CollectionSlug } from 'payload'
import { htmlEditorField } from '../fields/HtmlEditor'
import {
  membershipsListFilter,
  autoAssignSiteHook,
  isUserSuperadmin,
  getSiteIdFromHostname,
  getUserMembershipForSite,
} from '../access/multisite'
import { isSuperadminHost, getHostnameFromRequest } from '../lib/hostname'
import { sanitizeHtmlContent } from '../lib/sanitizeHtml'

/**
 * SiteMemberships Collection
 *
 * SECURITY: All site detection is hostname-based only.
 * No JWT fallback to prevent cross-site data access.
 */

// === ACCESS FUNCTIONS ===

// Condition to show fields only on chapter sites (hide on superadmin panel)
// Used for profile-related fields that are managed by chapter admins
const showOnlyOnChapterSites = () => {
  if (typeof window === 'undefined') return true
  const hostname = window.location.hostname
  return !isSuperadminHost(hostname)
}

// Check if on superadmin panel - used to show site selector
const isOnSuperadminPanelClient = () => {
  if (typeof globalThis.window === 'undefined') return false
  const hostname = globalThis.window.location.hostname
  return isSuperadminHost(hostname)
}

// Admin or self access for memberships - hostname only
const siteScopedAdminOrSelfMembership: Access = async ({ req }) => {
  const { user } = req
  if (!user) return false
  if (!req.payload) return false

  const hostname = getHostnameFromRequest(req)
  if (isSuperadminHost(hostname)) return isUserSuperadmin(user)
  if (isUserSuperadmin(user)) return true

  const siteId = await getSiteIdFromHostname(hostname, req.payload)
  if (!siteId) return false

  const membership = await getUserMembershipForSite(req, siteId)
  if (!membership) return false

  if (membership.role === 'member-admin') {
    return { site: { equals: siteId } } as Where
  }
  return { id: { equals: membership.id } } as Where
}

// Only admins can create memberships - hostname only
const siteMembershipCreateAccess: Access = async ({ req }) => {
  const { user } = req
  if (!user) return false
  if (!req.payload) return false
  if (isUserSuperadmin(user)) return true

  const hostname = getHostnameFromRequest(req)
  if (isSuperadminHost(hostname)) return false

  const siteId = await getSiteIdFromHostname(hostname, req.payload)
  if (!siteId) return false

  const membership = await getUserMembershipForSite(req, siteId)
  return membership?.role === 'member-admin'
}

// Only admins can delete memberships - hostname only
const siteMembershipAdminAccess: Access = async ({ req }) => {
  const { user } = req
  if (!user) return false
  if (!req.payload) return false

  const hostname = getHostnameFromRequest(req)
  if (isSuperadminHost(hostname)) return isUserSuperadmin(user)
  if (isUserSuperadmin(user)) return true

  const siteId = await getSiteIdFromHostname(hostname, req.payload)
  if (!siteId) return false

  const membership = await getUserMembershipForSite(req, siteId)
  if (membership?.role !== 'member-admin') return false

  // Admin can only delete memberships in their site
  return { site: { equals: siteId } } as Where
}

// Helper to check if user is admin (used for field access)
const isUserAdmin = (user: any): boolean => {
  return user?.isSuperadmin === true || user?.currentRole === 'member-admin'
}

// === COLLECTION CONFIG ===

export const SiteMemberships: CollectionConfig = {
  slug: 'site-memberships',
  admin: {
    useAsTitle: 'company',
    defaultColumns: ['name', 'surname', 'company', 'role', 'status'],
    listSearchableFields: [
      'name',
      'surname',
      'company',
      'phone',
      'jobPosition',
      'orgRole',
      'companyEmail',
      'companyPhone',
      'website',
    ],
    group: 'Members',
    description: 'Member profiles for each site',
    baseListFilter: membershipsListFilter,
    // Visible on both superadmin panel (to manage all memberships) and chapter panels
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    read: siteScopedAdminOrSelfMembership,
    create: siteMembershipCreateAccess,
    update: siteScopedAdminOrSelfMembership,
    delete: siteMembershipAdminAccess,
  },
  hooks: {
    beforeChange: [
      async (args) => autoAssignSiteHook(args),

      // Single synchronous sanitization pass — no DB I/O.
      // Combines website, HTML, phone, and email cleanup so the hook chain
      // doesn't pay async overhead for pure string transforms.
      ({ data }) => {
        if (!data) return data

        if (typeof data.website === 'string' && data.website) {
          data.website = data.website
            .replace(/^https?:\/\//i, '')
            .replace(/\s+/g, '')
            .trim()
        }

        if (data.description) {
          data.description = sanitizeHtmlContent(data.description)
        }
        if (data.companyDescription) {
          data.companyDescription = sanitizeHtmlContent(data.companyDescription)
        }

        const cleanPhone = (phone: string | null | undefined): string => {
          if (!phone) return ''
          const stripped = phone.replace(/\s+/g, '')
          return (stripped.split(/[,;/]/)[0] || '').trim()
        }
        if (data.phone) data.phone = cleanPhone(data.phone)
        if (data.companyPhone) data.companyPhone = cleanPhone(data.companyPhone)

        if (typeof data.companyEmail === 'string' && data.companyEmail) {
          data.companyEmail = data.companyEmail.toLowerCase().trim()
        }

        return data
      },

      // Consolidated user-relationship hook.
      // Replaces four previous hooks that each made their own sequential
      // DB roundtrips (create-new-user → populate name/surname →
      // sync-name-to-user → uniqueness check). The new ordering runs the
      // independent queries in parallel where possible.
      async ({ req, data, operation, originalDoc }) => {
        if (!data) return data

        // 1. createNewUser flow must run first because it sets data.user.
        if (data.createNewUser) {
          const { newUserEmail, newUserName, newUserSurname } = data
          if (!newUserEmail || !newUserName || !newUserSurname) {
            throw new Error('Email, First Name, and Last Name are required to create a new user')
          }

          const existingUser = await req.payload.find({
            collection: 'users',
            where: { email: { equals: newUserEmail } },
            limit: 1,
            depth: 0,
          })

          let userId: string
          if (existingUser.docs.length > 0) {
            userId = String(existingUser.docs[0].id)
          } else {
            const newUser = await req.payload.create({
              collection: 'users',
              data: {
                email: newUserEmail,
                name: newUserName,
                surname: newUserSurname,
                password: 'ChangeMe123!',
              },
            })
            userId = String(newUser.id)
          }

          data.user = userId
          // We already know the name/surname locally — skip the redundant findByID.
          if (!data.name) data.name = newUserName
          if (!data.surname) data.surname = newUserSurname
          delete data.createNewUser
          delete data.newUserEmail
          delete data.newUserName
          delete data.newUserSurname
        }

        const rawUser = data.user ?? originalDoc?.user
        const userId =
          typeof rawUser === 'string' || typeof rawUser === 'number'
            ? String(rawUser)
            : rawUser?.id
              ? String(rawUser.id)
              : null

        if (!userId) return data

        // 2. Decide what work we still need:
        //    - Fetch user only when we need to backfill name/surname.
        //    - Uniqueness check only on create.
        const needsUserFetch =
          (operation === 'create' || operation === 'update') && (!data.name || !data.surname)

        const needsUniqueCheck = operation === 'create' && data.site

        const [user, existingMembership] = await Promise.all([
          needsUserFetch
            ? req.payload
                .findByID({ collection: 'users', id: userId, depth: 0 })
                .catch(() => null)
            : Promise.resolve(null),
          needsUniqueCheck
            ? req.payload.find({
                collection: 'site-memberships',
                where: {
                  and: [{ user: { equals: userId } }, { site: { equals: data.site } }],
                },
                limit: 1,
                depth: 0,
              })
            : Promise.resolve(null),
        ])

        if (existingMembership && existingMembership.docs.length > 0) {
          throw new Error('This user already has a membership in this site')
        }

        if (user) {
          if (!data.name) data.name = user.name
          if (!data.surname) data.surname = user.surname
        }

        // 3. Sync any updated name/surname back to the users collection.
        // Only fires when something actually changed vs. originalDoc, so
        // pure membership updates don't trigger a user write.
        if (operation === 'update') {
          const update: Record<string, string> = {}
          if (data.name && data.name !== originalDoc?.name) update.name = data.name
          if (data.surname && data.surname !== originalDoc?.surname) update.surname = data.surname
          if (Object.keys(update).length > 0) {
            await req.payload.update({
              collection: 'users',
              id: userId,
              data: update,
              depth: 0,
            })
          }
        }

        return data
      },
    ],
    afterDelete: [
      // Cascade-delete this user's content for this site.
      // Uses bulk `where:` deletes so each collection is one query (previously
      // a find+loop, which was O(n) round-trips). All six deletions run in
      // parallel since they target independent collections/criteria.
      async ({ doc, req }) => {
        const userId = typeof doc.user === 'string' ? doc.user : doc.user?.id
        const siteId = typeof doc.site === 'string' ? doc.site : doc.site?.id

        if (!userId || !siteId) return

        const bulkDelete = (collection: CollectionSlug, where: any) =>
          req.payload
            .delete({ collection, where, depth: 0 })
            .then((res: any) => res?.docs?.length ?? 0)
            .catch((err: unknown) => {
              console.error(
                `[SiteMemberships] Cascade delete failed for ${collection}:`,
                err instanceof Error ? err.message : err,
              )
              return 0
            })

        const siteFilter = { site: { equals: siteId } }
        const byUser = (field: string) => ({
          and: [{ [field]: { equals: userId } }, siteFilter],
        })

        const [top40, sr, stories, meetings, refsFrom, refsTo] = await Promise.all([
          bulkDelete('top40', byUser('submittedBy')),
          bulkDelete('special-requests', byUser('requestedBy')),
          bulkDelete('success-stories', byUser('author')),
          bulkDelete('one-to-one-meetings', byUser('createdBy')),
          bulkDelete('referrals', byUser('fromUser')),
          bulkDelete('referrals', byUser('toUser')),
        ])

        console.log(
          `[SiteMemberships] Cascade-deleted for user ${userId} in site ${siteId}: ` +
            `Top40: ${top40}, Special Requests: ${sr}, Success Stories: ${stories}, ` +
            `Meetings: ${meetings}, Referrals: ${refsFrom + refsTo}`,
        )
      },
    ],
  },
  fields: [
    // === USER SELECTION OR CREATION ===
    {
      name: 'createNewUser',
      type: 'checkbox',
      label: 'Create New User',
      defaultValue: false,
      admin: {
        description: 'Check to create a new user instead of selecting existing',
        // Available on both superadmin and chapter panels for admins
      },
    },
    // Fields for creating new user (shown when createNewUser is checked)
    {
      type: 'row',
      admin: {
        condition: (data) => data?.createNewUser === true,
      },
      fields: [
        {
          name: 'newUserEmail',
          type: 'email',
          label: 'Email',
          admin: {
            description: 'Email for the new user account',
          },
        },
        {
          name: 'newUserName',
          type: 'text',
          label: 'First Name',
        },
        {
          name: 'newUserSurname',
          type: 'text',
          label: 'Last Name',
        },
      ],
    },
    // === RELATIONSHIPS ===
    {
      type: 'row',
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: false, // Not required when creating new user
          index: true,
          validate: (value: any, { siblingData }: { siblingData: any }) => {
            // Allow empty user when createNewUser is checked
            if (siblingData?.createNewUser === true) {
              return true
            }
            // Require user when not creating new user
            if (!value) {
              return 'Please select an existing user or check "Create New User"'
            }
            return true
          },
          admin: {
            description: 'Select existing user or check "Create New User" above',
            condition: (data) => data?.createNewUser !== true,
          },
        },
        {
          name: 'site',
          type: 'relationship',
          relationTo: 'sites',
          required: true,
          index: true,
          admin: {
            // Visible on superadmin panel, hidden on chapter sites (auto-assigned)
            condition: () => {
              if (typeof globalThis.window === 'undefined') return true
              const hostname = globalThis.window.location.hostname
              return isSuperadminHost(hostname)
            },
            description: 'The organisation this membership is for',
          },
        },
      ],
    },

    // === ROLE & STATUS (visible on both superadmin and chapter panels) ===
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
          access: {
            // Only admin can change roles
            update: ({ req: { user } }) => isUserAdmin(user),
          },
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
          access: {
            // Only admin can change status
            update: ({ req: { user } }) => isUserAdmin(user),
          },
        },
      ],
    },

    // === PROFILE INFO (hidden on superadmin panel) ===
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          index: true,
          admin: {
            description: 'First name (synced with user account)',
          },
        },
        {
          name: 'surname',
          type: 'text',
          index: true,
          admin: {
            description: 'Last name (synced with user account)',
          },
        },
      ],
    },
    {
      name: 'phone',
      type: 'text',
      index: true,
      admin: {
        description: 'Contact phone number for this chapter',
        condition: showOnlyOnChapterSites,
      },
    },
    {
      name: 'profileImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Profile photo',
        condition: showOnlyOnChapterSites,
      },
    },
    {
      name: 'description',
      label: 'About Me',
      type: 'textarea',
      admin: {
        condition: showOnlyOnChapterSites,
        components: {
          Field: '@/fields/HtmlEditor/Field#HtmlEditorField',
        },
      },
    },
    {
      name: 'logo',
      label: 'Company Logo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: showOnlyOnChapterSites,
      },
    },
    {
      name: 'slideImage',
      label: 'Presentation Slide Image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Image for slideshow presentation (recommended: 4:3 aspect ratio, 2000px width minimum)',
        condition: showOnlyOnChapterSites,
      },
    },
    {
      name: 'slideBackgroundColor',
      label: 'Slide Background Color',
      type: 'text',
      defaultValue: '#ffffff',
      admin: {
        description: 'Background color for slide image area (default: white)',
        condition: showOnlyOnChapterSites,
      },
    },
    {
      name: 'slideImageMode',
      label: 'Slide Image Display Mode',
      type: 'select',
      defaultValue: 'contain',
      options: [
        {
          label: 'Contain (fit within area)',
          value: 'contain',
        },
        {
          label: 'Cover (fill entire area)',
          value: 'cover',
        },
      ],
      admin: {
        description: 'How the image should fit in the 4:3 area',
        condition: showOnlyOnChapterSites,
      },
    },

    // === COMPANY INFO TAB (hidden on superadmin panel) ===
    {
      type: 'tabs',
      admin: {
        condition: showOnlyOnChapterSites,
      },
      tabs: [
        {
          label: 'Company Info',
          fields: [
            {
              name: 'company',
              type: 'text',
              index: true,
              // Not required - superadmin creates membership without profile data
              admin: {
                description: 'Company name',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'companyPhone',
                  type: 'text',
                  label: 'Company Phone',
                  index: true,
                },
                {
                  name: 'companyEmail',
                  type: 'email',
                  label: 'Company Email',
                  index: true,
                },
              ],
            },
            {
              name: 'website',
              type: 'text',
              index: true,
            },
            {
              name: 'country',
              type: 'text',
              index: true,
              admin: {
                description: 'Country (searchable). Stored as ISO 3166-1 alpha-2 code, e.g. "LV".',
                components: {
                  Field: '@/components/admin/CountrySelectField',
                },
              },
            },
            htmlEditorField({
              name: 'companyDescription',
              label: 'Company Description',
            }),
            {
              name: 'gallery',
              label: 'Gallery',
              type: 'array',
              admin: {
                description: 'Add images to showcase your company, portfolio, or offers',
              },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                {
                  name: 'caption',
                  type: 'text',
                },
              ],
            },
          ],
        },
        {
          label: 'Membership',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'inaugurationDate',
                  type: 'date',
                  label: 'Inauguration Date',
                  admin: {
                    date: {
                      pickerAppearance: 'dayOnly',
                    },
                  },
                },
                {
                  name: 'powerGroup',
                  type: 'relationship',
                  relationTo: 'power-groups',
                  label: 'Power Group',
                  filterOptions: ({ siblingData }) => {
                    const site = (siblingData as { site?: unknown } | undefined)?.site
                    if (site) {
                      return {
                        site: { equals: site },
                      }
                    }
                    return true
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'jobPosition',
                  type: 'text',
                  label: 'Job Position',
                  index: true,
                },
                {
                  name: 'orgRole',
                  type: 'text',
                  label: 'Position',
                  index: true,
                  admin: {
                    description: 'Role held in the organisation (e.g., President, Vice President, Treasurer)',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'powerGroupLead',
                  type: 'checkbox',
                  label: 'Power Group Lead',
                  defaultValue: false,
                },
              ],
            },
            {
              name: 'attendanceType',
              type: 'select',
              label: 'Attendance Type',
              defaultValue: 'onsite',
              options: [
                { label: 'On-site', value: 'onsite' },
                { label: 'Online', value: 'online' },
              ],
              admin: {
                description: 'How this member attends meetings',
              },
            },
          ],
        },
        {
          label: 'Metrics',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'tyfcbReceived',
                  type: 'number',
                  label: 'TYFCB Received',
                  defaultValue: 0,
                  admin: {
                    description: 'Thank You For Coming Back points received',
                  },
                },
                {
                  name: 'tyfcbGiven',
                  type: 'number',
                  label: 'TYFCB Given',
                  defaultValue: 0,
                  admin: {
                    description: 'Thank You For Coming Back points given',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'revenueReceived',
                  type: 'number',
                  label: 'Revenue Received (ROI)',
                  defaultValue: 0,
                  admin: {
                    description: 'Total revenue received through the organisation, in EUR',
                  },
                },
                {
                  name: 'referralsReceivedCount',
                  type: 'number',
                  label: 'Referrals Received',
                  defaultValue: 0,
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'referralsGivenCount',
                  type: 'number',
                  label: 'Referrals Given',
                  defaultValue: 0,
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'aiCreditBalanceUsd',
                  type: 'number',
                  label: 'AI Credit Balance (USD)',
                  defaultValue: 0,
                  min: -1,
                  admin: {
                    description: 'Remaining AI chatbot credit in USD',
                    step: 0.01,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
