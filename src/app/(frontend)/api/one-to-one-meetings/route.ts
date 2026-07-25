import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { notifyMeetingCreated } from '@/lib/activityNotifications'
import { getSettings } from '@/lib/getSiteSettings'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { DEFAULT_ORG_NAME } from '@/lib/branding'
import { DEFAULT_LOCALE } from '@/lib/i18n'

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

export async function POST(request: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  // Get base URL from request headers
  const host = headers.get('host') || 'localhost:3050'
  const protocol = headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const baseUrl = `${protocol}://${host}`

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if activities feature is enabled
  const currentSite = await getSettings()
  if (!currentSite?.enableActivities) {
    return NextResponse.json({ error: 'Activities feature is disabled' }, { status: 403 })
  }
  const siteSettings = await getSettings()

  try {
    const { metWith, invitedBy, location, topics, date } = await request.json()

    if (!metWith || !invitedBy || !location || !topics || !date) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Extract IDs for relationship fields (Postgres needs numeric IDs)
    const metWithId = extractRelationshipId(metWith)
    const invitedById = extractRelationshipId(invitedBy)

    if (!metWithId || !invitedById) {
      return NextResponse.json({ error: 'Invalid user IDs provided' }, { status: 400 })
    }

    const doc = await payload.create({
      collection: 'one-to-one-meetings',
      data: {
        metWith: metWithId,
        invitedBy: invitedById,
        location,
        topics,
        date,
        comments: [],
        createdBy: user.id,
      },
      // Override access since we already verified user is authenticated and active
      overrideAccess: true,
      // Pass request context so filterOptions can determine the site from hostname
      req: { headers, payload, user } as any,
    })

    // Fetch user details for notification
    const metWithUser = await payload.findByID({
      collection: 'users',
      id: metWithId,
      depth: 0,
    })

    const invitedByUser = await payload.findByID({
      collection: 'users',
      id: invitedById,
      depth: 0,
    })

    // Notify metWith user about the new meeting (if not the creator themselves)
    if (metWithUser && metWithId !== user.id) {
      notifyMeetingCreated({
        creator: {
          id: user.id,
          name: user.name || undefined,
          surname: user.surname || undefined,
          email: user.email,
        },
        metWith: {
          id: metWithUser.id,
          name: metWithUser.name || undefined,
          surname: metWithUser.surname || undefined,
          email: metWithUser.email,
        },
        invitedBy: invitedByUser
          ? {
              id: invitedByUser.id,
              name: invitedByUser.name || undefined,
              surname: invitedByUser.surname || undefined,
              email: invitedByUser.email,
            }
          : {
              id: user.id,
              name: user.name || undefined,
              surname: user.surname || undefined,
              email: user.email,
            },
        location,
        topics,
        date,
        meetingId: doc.id,
        baseUrl,
        chapterName: siteSettings?.siteName || DEFAULT_ORG_NAME,
        siteId: currentSite.id,
        locale: (currentSite.locale as 'lv' | 'en') || DEFAULT_LOCALE,
        timezone: currentSite.timezone,
      })
    }

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Error creating meeting:', error)
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
  }
}

/**
 * DELETE /api/one-to-one-meetings
 *
 * Bulk delete one-to-one meetings (for admin panel).
 */
export async function DELETE(request: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentSite = await getSettings()
  if (!currentSite?.enableActivities) {
    return NextResponse.json({ error: 'Activities feature is disabled' }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const ids: string[] = []

    for (const [key, value] of url.searchParams.entries()) {
      const match = key.match(/where\[and\]\[\d+\]\[id\]\[in\]\[\d+\]/)
      if (match && value) {
        ids.push(value)
      }
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided for deletion' }, { status: 400 })
    }

    const deletedDocs = []
    const errors = []

    for (const id of ids) {
      try {
        const existing = await payload.findByID({
          collection: 'one-to-one-meetings',
          id,
          depth: 0,
        })

        if (!existing) {
          errors.push({ id, error: 'Not found' })
          continue
        }

        const isOwner = String(existing.createdBy) === String(user.id)
        const isAdmin = (user as UserWithContext).role === 'member-admin'

        if (!isOwner && !isAdmin) {
          errors.push({ id, error: 'Not authorized' })
          continue
        }

        await payload.delete({ collection: 'one-to-one-meetings', id })
        deletedDocs.push({ id })
      } catch (err) {
        errors.push({ id, error: 'Failed to delete' })
      }
    }

    return NextResponse.json({
      docs: deletedDocs,
      errors: errors.length > 0 ? errors : null,
    })
  } catch (error) {
    console.error('Error deleting meetings:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
