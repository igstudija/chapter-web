import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { isSuperadminHost } from '@/lib/getSiteFromHost'
import type { Where } from 'payload'

/**
 * GET /api/superadmin/audit-logs
 *
 * Fetch audit logs for superadmin panel.
 * SECURITY: Only available on superadmin hosts, only for superadmin users.
 */
export async function GET(request: Request) {
  try {
    const headers = await getHeaders()
    const host = headers.get('host') || ''

    // SECURITY: Only allow on superadmin hosts
    if (!isSuperadminHost(host)) {
      return NextResponse.json(
        { error: 'This endpoint is only available on superadmin panel' },
        { status: 403 },
      )
    }

    const payload = await getPayload({ config })

    // Check if user is authenticated and is superadmin
    const { user } = await payload.auth({ headers })
    if (!user || !user.isSuperadmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const url = new URL(request.url)
    const page = Number.parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(Number.parseInt(url.searchParams.get('limit') || '50'), 100)
    const action = url.searchParams.get('action') || undefined

    // Build where clause
    let where: Where = {}
    if (action) {
      where = { action: { equals: action } }
    }

    const logs = await payload.find({
      collection: 'audit-logs',
      where,
      sort: '-createdAt',
      page,
      limit,
      depth: 1, // Include related user data
      overrideAccess: true, // We already verified superadmin status
    })

    return NextResponse.json({
      docs: logs.docs,
      totalDocs: logs.totalDocs,
      totalPages: logs.totalPages,
      page: logs.page,
      hasNextPage: logs.hasNextPage,
      hasPrevPage: logs.hasPrevPage,
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to fetch audit logs: ${errorMessage}` },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/superadmin/audit-logs/cleanup
 *
 * Manually trigger cleanup of expired audit logs.
 */
export async function DELETE() {
  try {
    const headers = await getHeaders()
    const host = headers.get('host') || ''

    // SECURITY: Only allow on superadmin hosts
    if (!isSuperadminHost(host)) {
      return NextResponse.json(
        { error: 'This endpoint is only available on superadmin panel' },
        { status: 403 },
      )
    }

    const payload = await getPayload({ config })

    // Check if user is authenticated and is superadmin
    const { user } = await payload.auth({ headers })
    if (!user || !user.isSuperadmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find and delete expired logs
    const now = new Date().toISOString()
    const expiredLogs = await payload.find({
      collection: 'audit-logs',
      where: {
        expiresAt: { less_than: now },
      },
      limit: 1000,
      overrideAccess: true,
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

    return NextResponse.json({
      success: true,
      deletedCount,
    })
  } catch (error) {
    console.error('Error cleaning up audit logs:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to cleanup audit logs: ${errorMessage}` },
      { status: 500 },
    )
  }
}
