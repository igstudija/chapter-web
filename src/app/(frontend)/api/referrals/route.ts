import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { notifyReferralCreated } from '@/lib/activityNotifications'
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
  const protocol =
    headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
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
    const { fromUser, toUser, date, description, status, value } = await request.json()

    if (!fromUser || !toUser || !date || !description) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }

    // Extract IDs for relationship fields (Postgres needs numeric IDs)
    const fromUserId = extractRelationshipId(fromUser)
    const toUserId = extractRelationshipId(toUser)

    if (!fromUserId || !toUserId) {
      return NextResponse.json({ error: 'Invalid user IDs provided' }, { status: 400 })
    }

    const doc = await payload.create({
      collection: 'referrals',
      data: {
        fromUser: fromUserId,
        toUser: toUserId,
        date,
        description,
        status: (status as 'pending' | 'success' | 'failed') || 'pending',
        createdBy: user.id,
        value: value !== undefined && value !== null ? Number(value) : undefined,
      },
      // Override access since we already verified user is authenticated and active
      overrideAccess: true,
      // Pass request context so filterOptions can determine the site from hostname
      req: { headers, payload, user } as any,
    })

    // Fetch user details for notification
    const fromUserData = await payload.findByID({
      collection: 'users',
      id: fromUserId,
      depth: 0,
    })

    const toUserData = await payload.findByID({
      collection: 'users',
      id: toUserId,
      depth: 0,
    })

    // Notify toUser about the new referral they received
    if (toUserData && toUserId !== user.id) {
      notifyReferralCreated({
        creator: {
          id: user.id,
          name: user.name || undefined,
          surname: user.surname || undefined,
          email: user.email,
        },
        fromUser: fromUserData
          ? {
              id: fromUserData.id,
              name: fromUserData.name || undefined,
              surname: fromUserData.surname || undefined,
              email: fromUserData.email,
            }
          : {
              id: user.id,
              name: user.name || undefined,
              surname: user.surname || undefined,
              email: user.email,
            },
        toUser: {
          id: toUserData.id,
          name: toUserData.name || undefined,
          surname: toUserData.surname || undefined,
          email: toUserData.email,
        },
        description,
        date,
        value: value || undefined,
        referralId: doc.id,
        baseUrl,
        chapterName: siteSettings?.siteName || DEFAULT_ORG_NAME,
        locale: (currentSite.locale as 'lv' | 'en') || DEFAULT_LOCALE,
        timezone: currentSite.timezone,
      })
    }

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Error creating referral:', error)
    return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if activities feature is enabled
  const currentSite = await getSettings()
  if (!currentSite?.enableActivities) {
    return NextResponse.json({ error: 'Activities feature is disabled' }, { status: 403 })
  }

  try {
    // Parse query parameters for bulk delete
    const url = new URL(request.url)
    const ids: string[] = []

    // Extract IDs from query params (Payload sends: where[and][0][id][in][0]=1, where[and][0][id][in][1]=2, etc.)
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
          collection: 'referrals',
          id,
          depth: 0,
        })

        if (!existing) {
          errors.push({ id, error: 'Not found' })
          continue
        }

        // Check if user is creator or admin
        const isCreator = String(existing.createdBy) === String(user.id)
        const isAdmin = (user as UserWithContext).role === 'member-admin'

        if (!isCreator && !isAdmin) {
          errors.push({ id, error: 'Not authorized' })
          continue
        }

        await payload.delete({ collection: 'referrals', id })
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
    console.error('Error deleting referrals:', error)
    return NextResponse.json({ error: 'Failed to delete referrals' }, { status: 500 })
  }
}
