import type { CollectionConfig, Where } from 'payload'
import { showOnlyOnSuperadminPanel } from '../access/adminVisibility'
import { getSiteIdFromHostname, invalidateHostnameCache } from '../access/multisite'
import { getHostnameFromRequest } from '../lib/hostname'

/**
 * Sites Collection
 *
 * SECURITY: Site detection uses hostname-based lookup only.
 * No JWT fallback to prevent cross-site data access.
 */
export const Sites: CollectionConfig = {
  slug: 'sites',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'domain', 'status'],
    group: 'System',
    description: 'Manage the organisations hosted on this install',
    hidden: showOnlyOnSuperadminPanel,
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    // Only superadmin can manage sites
    read: async ({ req }) => {
      const { user } = req
      if (!user) return false
      if (user.isSuperadmin) return true
      if (!req.payload) return false

      // SECURITY: Always use hostname for site detection - no JWT fallback
      const hostname = getHostnameFromRequest(req)
      const siteId = await getSiteIdFromHostname(hostname, req.payload)

      if (!siteId) return false

      // Non-superadmin users can only see their own site
      return { id: { equals: siteId } } as Where
    },
    create: ({ req: { user } }) => user?.isSuperadmin === true,
    update: ({ req: { user } }) => user?.isSuperadmin === true,
    delete: ({ req: { user } }) => user?.isSuperadmin === true,
  },
  hooks: {
    // Keep the hostname → site ID cache in sync when the source of truth changes.
    afterChange: [() => invalidateHostnameCache()],
    afterDelete: [() => invalidateHostnameCache()],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          admin: {
            description: 'Organisation name, e.g., "Riga Business Club"',
          },
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          admin: {
            description: 'URL-friendly identifier, e.g., "vivaldi"',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'domain',
          type: 'text',
          required: true,
          unique: true,
          admin: {
            description: 'Primary domain, e.g., "riga.example.org"',
          },
        },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'active',
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ],
        },
      ],
    },
    // Features - controlled by superadmin only
    {
      name: 'enableActivities',
      type: 'checkbox',
      defaultValue: false,
      label: 'Enable Activities Module',
      admin: {
        description: 'Enable 1-2-1 meetings, referrals tracking',
      },
    },
    {
      name: 'enableAttendance',
      type: 'checkbox',
      defaultValue: false,
      label: 'Enable Attendance Tracking',
      admin: {
        description: 'Enable onsite/online attendance tracking in slideshow',
      },
    },
    {
      name: 'enableSuccessStories',
      type: 'checkbox',
      defaultValue: true,
      label: 'Enable Success Stories',
      admin: {
        description: 'Enable success stories feature in profile and global pages',
      },
    },
    {
      name: 'enableAiChat',
      type: 'checkbox',
      defaultValue: false,
      label: 'Enable AI Chat',
      admin: {
        description: 'Enable AI chatbot for this chapter (requires global AI Settings to be enabled)',
      },
    },
    {
      name: 'includeInSharedRequests',
      type: 'checkbox',
      defaultValue: false,
      label: 'Include in shared special requests link',
      admin: {
        description:
          'Show this chapter as a section on the brand-free, token-gated combined special requests page',
      },
    },
    {
      name: 'locale',
      type: 'select',
      defaultValue: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: 'Latvian', value: 'lv' },
      ],
    },
    {
      name: 'timezone',
      type: 'text',
      defaultValue: 'UTC',
      admin: {
        description: 'IANA timezone identifier (e.g., Europe/Riga, Europe/London)',
      },
    },
  ],
}
