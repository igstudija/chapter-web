import type { CollectionConfig, Access, Where, CollectionSlug } from 'payload'
import { adminOnly, adminFieldAccess, isAdmin } from '../access'
import { htmlEditorField } from '../fields/HtmlEditor'
import { sanitizeHtmlContent } from '../lib/sanitizeHtml'

/**
 * Members
 *
 * The member profile: everything about a person that is not their login.
 * `Users` holds authentication and authorisation — email, password, role,
 * status. This holds who they are in the organisation: company, position,
 * photo, contact details, power group, presentation slide.
 *
 * It was `Members` when one install served several organisations and a
 * person could hold a membership in each. With a single organisation there is
 * one record per user, so it is named for what it stores rather than for the
 * link it used to represent.
 */

/**
 * Administrators may read and edit every profile; a member only their own.
 *
 * Previously this resolved the request's hostname to an organisation and then
 * looked up the caller's membership in it, on every check. Both facts now live
 * on the user record, so it is a comparison.
 */
const adminOrOwnProfile: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user)) return true
  return { user: { equals: user.id } } as Where
}

// === COLLECTION CONFIG ===

export const Members: CollectionConfig = {
  slug: 'members',
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
    // Visible on both superadmin panel (to manage all memberships) and chapter panels
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    read: adminOrOwnProfile,
    create: adminOnly,
    update: adminOrOwnProfile,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [

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
                role: 'member',
                status: 'active',
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

        // One member record per user. This used to be "one per user per site".
        const needsUniqueCheck = operation === 'create' && Boolean(userId)

        const [user, existingMembership] = await Promise.all([
          needsUserFetch
            ? req.payload
                .findByID({ collection: 'users', id: userId, depth: 0 })
                .catch(() => null)
            : Promise.resolve(null),
          needsUniqueCheck
            ? req.payload.find({
                collection: 'members',
                where: { user: { equals: userId } },
                limit: 1,
                depth: 0,
              })
            : Promise.resolve(null),
        ])

        if (existingMembership && existingMembership.docs.length > 0) {
          throw new Error('This user already has a member profile')
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
      // Cascade-delete this member's content.
      // Uses bulk `where:` deletes so each collection is one query (previously
      // a find+loop, which was O(n) round-trips). All six deletions run in
      // parallel since they target independent collections/criteria.
      async ({ doc, req }) => {
        const userId = typeof doc.user === 'string' ? doc.user : doc.user?.id

        if (!userId) return

        const bulkDelete = (collection: CollectionSlug, where: any) =>
          req.payload
            .delete({ collection, where, depth: 0 })
            .then((res: any) => res?.docs?.length ?? 0)
            .catch((err: unknown) => {
              console.error(
                `[Members] Cascade delete failed for ${collection}:`,
                err instanceof Error ? err.message : err,
              )
              return 0
            })

        const byUser = (field: string) => ({ [field]: { equals: userId } })

        const [top40, sr, stories, meetings, refsFrom, refsTo] = await Promise.all([
          bulkDelete('top40', byUser('submittedBy')),
          bulkDelete('special-requests', byUser('requestedBy')),
          bulkDelete('success-stories', byUser('author')),
          bulkDelete('one-to-one-meetings', byUser('createdBy')),
          bulkDelete('referrals', byUser('fromUser')),
          bulkDelete('referrals', byUser('toUser')),
        ])

        console.log(
          `[Members] Cascade-deleted for user ${userId}: ` +
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
            update: ({ req: { user } }) => isAdmin(user),
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
            update: ({ req: { user } }) => isAdmin(user),
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
      },
    },
    {
      name: 'profileImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Profile photo',
      },
    },
    {
      name: 'description',
      label: 'About Me',
      type: 'textarea',
      admin: {
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
      },
    },
    {
      name: 'slideMediaType',
      label: 'Slide Media',
      type: 'select',
      defaultValue: 'image',
      options: [
        { label: 'Images', value: 'image' },
        { label: 'Video (YouTube / Vimeo)', value: 'video' },
      ],
      admin: {
        description: 'Whether the slide shows a photo sequence or an embedded video',
      },
    },
    {
      name: 'slideImage',
      label: 'Presentation Slide Image (legacy)',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Kept in sync with the first entry of Presentation Slide Images. Edit that field instead.',
      },
    },
    {
      name: 'slideImages',
      label: 'Presentation Slide Images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description:
          'Shown in order, cross-fading through the whole set. Recommended: 4:3 aspect ratio, 2000px width minimum.',
      },
    },
    {
      name: 'slideVideoUrl',
      label: 'Slide Video URL',
      type: 'text',
      admin: {
        description:
          'YouTube or Vimeo link. Plays muted and looping — browsers block autoplay with sound.',
        condition: (_, siblingData) => siblingData?.slideMediaType === 'video',
      },
    },
    {
      name: 'slideSpecialRequestDisplay',
      label: 'My Special Request',
      type: 'select',
      defaultValue: 'inherit',
      options: [
        { label: 'Chapter default', value: 'inherit' },
        { label: 'Red bar along the bottom', value: 'bar' },
        { label: 'Balloon in the middle, last 5 seconds', value: 'flash' },
        { label: 'Not shown', value: 'off' },
      ],
      admin: {
        description: "Overrides the chapter's choice for this member's slide only.",
      },
    },
    {
      name: 'slideNextSpeakerPosition',
      label: 'Next Speaker Badge On My Slide',
      type: 'select',
      defaultValue: 'inherit',
      options: [
        { label: 'Chapter default', value: 'inherit' },
        { label: 'Top right', value: 'top' },
        { label: 'Bottom right', value: 'bottom' },
      ],
      admin: {
        description: 'Where the "up next" badge sits while this member is on screen.',
      },
    },
    {
      name: 'slideTemplate',
      label: 'Slide Template',
      type: 'select',
      defaultValue: 'classic',
      options: [
        { label: 'Classic (info left, 4:3 media right)', value: 'classic' },
        { label: 'Cover (full-bleed media, info overlay)', value: 'cover' },
        { label: 'Reels (full-bleed media, info layer on the left)', value: 'reels' },
      ],
      admin: {
        description: 'Layout of the member slide. All templates show the same information.',
      },
    },
    {
      name: 'slideBackgroundColor',
      label: 'Slide Background Color',
      type: 'text',
      defaultValue: '#ffffff',
      admin: {
        description: 'Background color for slide image area (default: white)',
      },
    },
    {
      name: 'slideBackgroundColorRight',
      label: 'Slide Background Colour — Media Side',
      type: 'text',
      admin: {
        description:
          'The colour behind the media on every template: Classic\'s media column, and the canvas a contained photo does not cover on Cover and Reels. Empty falls back to the main slide colour.',
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
      },
    },

    // === COMPANY INFO TAB (hidden on superadmin panel) ===
    {
      type: 'tabs',
      admin: {
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
