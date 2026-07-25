import type { CollectionConfig } from 'payload'
import { isUserSuperadmin } from '../access/multisite'

/**
 * Audit Logs Collection
 *
 * Stores security-relevant actions for monitoring and compliance.
 * Data retention: 1 month (cleaned up via scheduled job)
 *
 * Only superadmins can view logs. No one can modify or delete through API.
 */
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'performedBy', 'targetType', 'targetId', 'createdAt'],
    group: 'System',
    description: 'Security audit trail - automatically cleaned after 1 month',
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    read: ({ req }) => {
      const { user } = req
      if (!user) return false
      return isUserSuperadmin(user)
    },
    create: () => false, // Only created programmatically
    update: () => false, // Immutable
    delete: () => false, // Only deleted by scheduled cleanup
  },
  fields: [
    {
      name: 'action',
      type: 'select',
      required: true,
      options: [
        { label: 'User Deleted', value: 'user_deleted' },
        { label: 'User Created', value: 'user_created' },
        { label: 'User Updated', value: 'user_updated' },
        { label: 'Superadmin Login', value: 'superadmin_login' },
        { label: 'Superadmin Login Failed', value: 'superadmin_login_failed' },
        { label: 'Membership Created', value: 'membership_created' },
        { label: 'Membership Deleted', value: 'membership_deleted' },
        { label: 'Site Created', value: 'site_created' },
        { label: 'Site Deleted', value: 'site_deleted' },
      ],
      admin: {
        description: 'Type of action performed',
      },
    },
    {
      name: 'performedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'User who performed the action',
      },
    },
    {
      name: 'performedByEmail',
      type: 'text',
      admin: {
        description: 'Email of user (preserved if user is deleted)',
      },
    },
    {
      name: 'targetType',
      type: 'select',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Site', value: 'site' },
        { label: 'Membership', value: 'membership' },
      ],
      admin: {
        description: 'Type of entity affected',
      },
    },
    {
      name: 'targetId',
      type: 'text',
      admin: {
        description: 'ID of the affected entity',
      },
    },
    {
      name: 'targetEmail',
      type: 'text',
      admin: {
        description: 'Email of affected user (if applicable)',
      },
    },
    {
      name: 'details',
      type: 'json',
      admin: {
        description: 'Additional action details',
      },
    },
    {
      name: 'ipAddress',
      type: 'text',
      admin: {
        description: 'IP address of the request',
      },
    },
    {
      name: 'userAgent',
      type: 'text',
      admin: {
        description: 'User agent string',
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      admin: {
        description: 'When this log entry should be deleted (1 month from creation)',
        position: 'sidebar',
      },
      index: true,
    },
  ],
  timestamps: true,
}
