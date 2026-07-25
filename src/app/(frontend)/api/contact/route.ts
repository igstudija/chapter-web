import { NextRequest, NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { getSettings } from '@/lib/getSiteSettings'
import { checkRateLimit } from '@/lib/rateLimit'

const CONTACT_RATE_LIMIT = {
  identifier: 'contact-form',
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const rateCheck = checkRateLimit(ip, CONTACT_RATE_LIMIT)
    if (!rateCheck.success) {
      return NextResponse.json(
        { message: 'Too many submissions. Please try again later.' },
        { status: 429 },
      )
    }

    const body = await req.json()
    const { name, email, phone, subject, message } = body

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 })
    }

    // Sanitize inputs (basic XSS prevention)
    const sanitize = (str: string | null | undefined): string => {
      if (!str) return ''
      return str.replaceAll(/[<>]/g, '').trim().slice(0, 1000)
    }

    const payload = await getPayload({ config })

    // Get current site from hostname
    const settings = await getSettings()

    // Create submission with overrideAccess since this is a public form
    await payload.create({
      collection: 'contact-submissions',
      overrideAccess: true,
      data: {
        name: sanitize(name),
        email: email.trim().toLowerCase(),
        phone: sanitize(phone),
        subject: sanitize(subject),
        message: sanitize(message),
        status: 'new',
      },
    })

    return NextResponse.json({ message: 'Message sent successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error in contact form:', error)
    return NextResponse.json(
      { message: 'An error occurred. Please try again later.' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/contact
 *
 * Bulk delete contact submissions (for admin panel).
 */
export async function DELETE(request: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins can delete contact submissions
  const isAdmin = (user as UserWithContext).role === 'member-admin'
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
        const doc = await payload.delete({ collection: 'contact-submissions', id })
        deletedDocs.push(doc)
      } catch {
        errors.push({ message: `Failed to delete ${id}` })
      }
    }

    return NextResponse.json({
      docs: deletedDocs,
      errors,
      message: `Successfully deleted ${deletedDocs.length} Contact Submission(s).`,
    })
  } catch (error) {
    console.error('Error deleting contact submissions:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
