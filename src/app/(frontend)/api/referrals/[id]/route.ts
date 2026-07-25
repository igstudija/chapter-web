import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSettings } from '@/lib/getSiteSettings'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'

// Extract ID from relationship field (can be string, number, or object with id)
function extractRelationshipId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const numId = Number.parseInt(value, 10)
    return Number.isNaN(numId) ? null : numId
  }
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number') return id
    if (typeof id === 'string') {
      const numId = Number.parseInt(id, 10)
      return Number.isNaN(numId) ? null : numId
    }
  }
  return null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })
  const { id } = await params

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if activities feature is enabled
  const settings = await getSettings()
  if (!settings?.enableActivities) {
    return NextResponse.json({ error: 'Activities feature is disabled' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const existing = await payload.findByID({
      collection: 'referrals',
      id,
      depth: 0,
    })

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Only creator can edit
    if (String(existing.createdBy) !== String(user.id)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Only allow editing pending referrals
    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending referrals can be edited' }, { status: 400 })
    }

    // Extract IDs for relationship fields (Postgres needs numeric IDs)
    const fromUserId = extractRelationshipId(body.fromUser)
    const toUserId = extractRelationshipId(body.toUser)

    if (!fromUserId || !toUserId) {
      return NextResponse.json({ error: 'Invalid user IDs provided' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      fromUser: fromUserId,
      toUser: toUserId,
      date: body.date,
      description: body.description,
    }

    // Include value if provided
    if (body.value !== undefined) {
      updateData.value = body.value
    }

    const doc = await payload.update({
      collection: 'referrals',
      id,
      data: updateData,
      // Override access since we already verified ownership above
      overrideAccess: true,
      // Pass request context so filterOptions can determine the site from hostname
      req: { headers, payload, user } as any,
    })

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Error updating referral:', error)
    return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })
  const { id } = await params

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if activities feature is enabled
  const currentSite2 = await getSettings()
  if (!currentSite2?.enableActivities) {
    return NextResponse.json({ error: 'Activities feature is disabled' }, { status: 403 })
  }

  try {
    const existing = await payload.findByID({
      collection: 'referrals',
      id,
      depth: 0,
    })

    if (!existing || String(existing.createdBy) !== String(user.id)) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
    }

    // Only allow deleting pending referrals
    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending referrals can be deleted' }, { status: 400 })
    }

    await payload.delete({ collection: 'referrals', id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting referral:', error)
    return NextResponse.json({ error: 'Failed to delete referral' }, { status: 500 })
  }
}
