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
      collection: 'one-to-one-meetings',
      id,
      depth: 0,
    })

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Only creator can edit main fields
    if (String(existing.createdBy) !== String(user.id)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Extract IDs for relationship fields (Postgres needs numeric IDs)
    const metWithId = extractRelationshipId(body.metWith)
    const invitedById = extractRelationshipId(body.invitedBy)

    if (!metWithId || !invitedById) {
      return NextResponse.json({ error: 'Invalid user IDs provided' }, { status: 400 })
    }

    const doc = await payload.update({
      collection: 'one-to-one-meetings',
      id,
      data: {
        metWith: metWithId,
        invitedBy: invitedById,
        location: body.location,
        topics: body.topics,
        date: body.date,
      },
      // Override access since we already verified ownership above
      overrideAccess: true,
      // Pass request context so filterOptions can determine the site from hostname
      req: { headers, payload, user } as any,
    })

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Error updating meeting:', error)
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 })
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
      collection: 'one-to-one-meetings',
      id,
      depth: 0,
    })

    if (!existing || String(existing.createdBy) !== String(user.id)) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
    }

    await payload.delete({ collection: 'one-to-one-meetings', id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting meeting:', error)
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 })
  }
}
