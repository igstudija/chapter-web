import type { Payload } from 'payload'

type AuditAction =
  | 'user_deleted'
  | 'user_created'
  | 'user_updated'
  | 'admin_login'
  | 'admin_login_failed'
  | 'member_created'
  | 'member_deleted'

type TargetType = 'user' | 'member'

interface AuditLogParams {
  payload: Payload
  action: AuditAction
  performedById?: string
  performedByEmail?: string
  targetType?: TargetType
  targetId?: string
  targetEmail?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Create an audit log entry
 *
 * Automatically sets expiresAt to 1 month from now.
 */
export async function createAuditLog({
  payload,
  action,
  performedById,
  performedByEmail,
  targetType,
  targetId,
  targetEmail,
  details,
  ipAddress,
  userAgent,
}: AuditLogParams): Promise<void> {
  try {
    // Set expiration to 1 month from now
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 1)

    await payload.create({
      collection: 'audit-logs',
      data: {
        action,
        performedBy: performedById ? Number(performedById) : undefined,
        performedByEmail,
        targetType,
        targetId,
        targetEmail,
        details,
        ipAddress,
        userAgent,
        expiresAt: expiresAt.toISOString(),
      },
      // Override access control - audit logs are created programmatically only
      overrideAccess: true,
    })
  } catch (error) {
    // Don't throw - audit logging should not break main functionality
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Clean up expired audit logs
 *
 * Should be called periodically (e.g., daily via cron job)
 */
export async function cleanupExpiredAuditLogs(payload: Payload): Promise<number> {
  try {
    const now = new Date().toISOString()

    const expiredLogs = await payload.find({
      collection: 'audit-logs',
      where: {
        expiresAt: { less_than: now },
      },
      limit: 1000,
    })

    let deletedCount = 0
    for (const log of expiredLogs.docs) {
      await payload.delete({
        collection: 'audit-logs',
        id: log.id,
        overrideAccess: true,
      })
      deletedCount++
    }

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} expired audit logs`)
    }

    return deletedCount
  } catch (error) {
    console.error('Failed to cleanup audit logs:', error)
    return 0
  }
}
