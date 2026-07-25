import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { isSuperadminHost } from '@/lib/getSiteFromHost'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rateLimit'
import { createAuditLog } from '@/lib/auditLog'
import type { Payload } from 'payload'

// Helper: Delete all documents from a collection matching a query
async function deleteRelatedDocuments(
  payload: Payload,
  collection: any,
  where: Record<string, any>,
): Promise<number> {
  const result = await payload.find({ collection, where, limit: 1000 })
  for (const doc of result.docs) {
    await payload.delete({ collection, id: (doc as any).id })
  }
  return result.totalDocs
}

// Helper: Validate security constraints
async function validateUserDeletion(payload: Payload, headers: Headers, targetUserId: string) {
  const authResult = await payload.auth({ headers })
  const user = authResult.user

  if (!user || !(user as any).isSuperadmin) {
    return { error: 'Unauthorized', status: 401 }
  }

  if ((user as any).id === targetUserId) {
    return { error: 'Cannot delete your own account', status: 400 }
  }

  const targetUser = await payload.findByID({ collection: 'users', id: targetUserId })

  if (!targetUser) {
    return { error: 'User not found', status: 404 }
  }

  if ((targetUser as any).isSuperadmin) {
    return {
      error: 'Cannot delete superadmin accounts. Remove superadmin status first.',
      status: 403,
    }
  }

  return { user, targetUser }
}

// DELETE user and all related data
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let payload
  let user
  let clientIp
  let userAgent

  try {
    const headers = await getHeaders()
    const host = headers.get('host') || ''
    clientIp = getClientIp(headers)
    userAgent = headers.get('user-agent') || 'unknown'

    // SECURITY: Only allow on superadmin hosts
    if (!isSuperadminHost(host)) {
      return NextResponse.json(
        { error: 'This endpoint is only available on superadmin panel' },
        { status: 403 },
      )
    }

    // SECURITY: Rate limiting - 10 delete requests per minute per IP
    const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.SUPERADMIN_DELETE)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          },
        },
      )
    }

    payload = await getPayload({ config })
    const { id } = await params

    // SECURITY: Validate user ID format (MongoDB ObjectID)
    if (!/^[a-f0-9]{24}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
    }

    // Validate user permissions and target user
    const validationResult = await validateUserDeletion(payload, headers, id)
    if ('error' in validationResult) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: validationResult.status },
      )
    }

    user = validationResult.user as any
    const targetUser = validationResult.targetUser as any

    // Delete all related data using helper function
    const deletedCounts = {
      memberships: await deleteRelatedDocuments(payload, 'site-memberships', {
        user: { equals: id },
      }),
      referrals:
        (await deleteRelatedDocuments(payload, 'referrals', { fromUser: { equals: id } })) +
        (await deleteRelatedDocuments(payload, 'referrals', { toUser: { equals: id } })) +
        (await deleteRelatedDocuments(payload, 'referrals', { createdBy: { equals: id } })),
      meetings:
        (await deleteRelatedDocuments(payload, 'one-to-one-meetings', {
          metWith: { equals: id },
        })) +
        (await deleteRelatedDocuments(payload, 'one-to-one-meetings', {
          invitedBy: { equals: id },
        })) +
        (await deleteRelatedDocuments(payload, 'one-to-one-meetings', {
          createdBy: { equals: id },
        })),
      top40: await deleteRelatedDocuments(payload, 'top40', { submittedBy: { equals: id } }),
      successStories:
        (await deleteRelatedDocuments(payload, 'success-stories', { author: { equals: id } })) +
        (await deleteRelatedDocuments(payload, 'success-stories', {
          partnerMember: { equals: id },
        })),
      specialRequests: await deleteRelatedDocuments(payload, 'special-requests', {
        requestedBy: { equals: id },
      }),
    }

    // Delete the user
    await payload.delete({
      collection: 'users',
      id,
    })

    // AUDIT: Log the user deletion
    await createAuditLog({
      payload,
      action: 'user_deleted',
      performedById: user.id,
      performedByEmail: user.email,
      targetType: 'user',
      targetId: id,
      targetEmail: targetUser.email,
      details: {
        deletedCounts,
        targetUserName: `${targetUser.name || ''} ${targetUser.surname || ''}`.trim(),
      },
      ipAddress: clientIp,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      deleted: deletedCounts,
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to delete user: ${errorMessage}` }, { status: 500 })
  }
}
