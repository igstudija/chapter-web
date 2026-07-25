import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { getSiteFromHost } from '@/lib/getSiteFromHost'
import { isSessionValidForCurrentSite } from '@/lib/validateSessionSite'

/**
 * POST /api/special-requests
 *
 * Creates a special request for the current site.
 * SECURITY: Site is ALWAYS determined from hostname - never from request body.
 */
export async function POST(request: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // SECURITY: Validate that user's session site matches current hostname
  const host = headers.get('host')
  const isValidSession = await isSessionValidForCurrentSite(user, host)
  if (!isValidSession) {
    return NextResponse.json(
      { error: 'Session invalid for this site. Please log in again.' },
      { status: 401 },
    )
  }

  try {
    const { request: requestText, registrationNumber } = await request.json()

    // SECURITY: Always use hostname for site detection - never accept siteId from client
    const currentSite = await getSiteFromHost(host)
    const currentSiteId = currentSite?.id || null

    if (!currentSiteId) {
      return NextResponse.json({ error: 'Site not found' }, { status: 400 })
    }

    if (!requestText) {
      return NextResponse.json({ error: 'Request content is required' }, { status: 400 })
    }

    // Place new requests at the top of the member's list with a unique sortOrder
    // (one below their current minimum) so they never collide at the default 0.
    const topMost = await payload.find({
      collection: 'special-requests',
      where: { requestedBy: { equals: user.id } },
      sort: 'sortOrder',
      limit: 1,
      depth: 0,
    })
    const sortOrder = topMost.docs.length ? (topMost.docs[0].sortOrder ?? 0) - 1 : 0

    const doc = await payload.create({
      collection: 'special-requests',
      data: {
        request: requestText,
        registrationNumber: registrationNumber || undefined,
        requestedBy: user.id,
        site: currentSiteId,
        status: 'open',
        sortOrder,
      },
      // Override access since we already verified user is authenticated and active
      overrideAccess: true,
      // Pass request context so filterOptions can determine the site from hostname
      req: { headers, payload, user } as any,
    })

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Error creating special request:', error)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}

/**
 * DELETE /api/special-requests
 *
 * Bulk delete special requests (for admin panel).
 */
export async function DELETE(request: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // SECURITY: Validate that user's session site matches current hostname
  const host = headers.get('host')
  const isValidSession = await isSessionValidForCurrentSite(user, host)
  if (!isValidSession) {
    return NextResponse.json(
      { error: 'Session invalid for this site. Please log in again.' },
      { status: 401 },
    )
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
          collection: 'special-requests',
          id,
          depth: 0,
        })

        if (!existing) {
          errors.push({ id, error: 'Not found' })
          continue
        }

        const isOwner = String(existing.requestedBy) === String(user.id)
        const isAdmin = (user as UserWithContext).currentRole === 'member-admin'

        if (!isOwner && !isAdmin) {
          errors.push({ id, error: 'Not authorized' })
          continue
        }

        await payload.delete({ collection: 'special-requests', id })
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
    console.error('Error deleting special requests:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
