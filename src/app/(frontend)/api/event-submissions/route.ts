import { NextRequest, NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getCurrentSite } from '@/lib/getSiteSettings'
import { checkRateLimit } from '@/lib/rateLimit'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'

const EVENT_RATE_LIMIT = {
  identifier: 'event-submission',
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const rateCheck = checkRateLimit(ip, EVENT_RATE_LIMIT)
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 },
      )
    }

    const body = await req.json()
    const { event, name, email, phone, company, invitedBy, message } = body

    // Validate required fields
    if (!event || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Sanitize inputs (basic XSS prevention)
    const sanitize = (str: string | null | undefined): string | undefined => {
      if (!str) return undefined
      return str.replaceAll(/[<>]/g, '').trim().slice(0, 1000)
    }

    const payload = await getPayload({ config })

    // Validate event exists and is published
    let existingEvent
    try {
      existingEvent = await payload.findByID({
        collection: 'events',
        id: String(event),
        overrideAccess: true,
      })
    } catch {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
    }

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (existingEvent._status !== 'published') {
      return NextResponse.json({ error: 'Event is not available' }, { status: 400 })
    }

    // Get current site
    const currentSite = await getCurrentSite()

    // Create submission with overrideAccess
    const submission = await payload.create({
      collection: 'event-submissions',
      overrideAccess: true,
      data: {
        event: event,
        name: sanitize(name) || '',
        email: email.trim().toLowerCase(),
        phone: sanitize(phone),
        company: sanitize(company),
        invitedBy: sanitize(invitedBy),
        message: sanitize(message),
        status: 'pending',
        site: currentSite?.id || undefined,
      },
    })

    return NextResponse.json({ success: true, id: submission.id }, { status: 201 })
  } catch (error) {
    console.error('Event submission error:', error)
    return NextResponse.json({ error: 'Failed to submit registration' }, { status: 500 })
  }
}

/**
 * DELETE /api/event-submissions
 *
 * Bulk delete event submissions (for admin panel).
 */
export async function DELETE(request: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isAdmin =
    (user as UserWithContext).currentRole === 'member-admin' ||
    (user as any).isSuperadmin === true
  if (!isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
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
    const errors: { message: string }[] = []

    for (const id of ids) {
      try {
        const doc = await payload.delete({ collection: 'event-submissions', id })
        deletedDocs.push(doc)
      } catch {
        errors.push({ message: `Failed to delete ${id}` })
      }
    }

    return NextResponse.json({
      docs: deletedDocs,
      errors,
      message: `Successfully deleted ${deletedDocs.length} Event Submission(s).`,
    })
  } catch (error) {
    console.error('Error deleting event submissions:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
