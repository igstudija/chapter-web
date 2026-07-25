import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { getSiteFromHost } from '@/lib/getSiteFromHost'

/**
 * POST /api/top20
 *
 * Creates a Top20 entry for the current site.
 * SECURITY: Site is ALWAYS determined from hostname - never from request body.
 * (Per-entry PATCH/DELETE is handled by Payload's REST API at /api/top20/:id,
 * gated by the Top20 collection access control.)
 */
export async function POST(request: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { contactPerson, position, companyName, registrationNumber, notes, businessTags } = await request.json()

    // SECURITY: Always use hostname for site detection - never accept siteId from client
    const host = headers.get('host')
    const currentSite = await getSiteFromHost(host)
    const currentSiteId = currentSite?.id || null

    if (!currentSiteId) {
      return NextResponse.json({ error: 'Site not found' }, { status: 400 })
    }

    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    const doc = await payload.create({
      collection: 'top20',
      data: {
        contactPerson,
        companyName,
        position: position || undefined,
        registrationNumber: registrationNumber || undefined,
        notes: notes || undefined,
        businessTags: businessTags || undefined,
        submittedBy: user.id,
        site: currentSiteId,
      },
      // Override access since we already verified user is authenticated and active
      overrideAccess: true,
      // Pass request context so filterOptions can determine the site from hostname
      req: { headers, payload, user } as any,
    })

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Error creating top20 entry:', error)
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }
}

/**
 * DELETE /api/top20
 *
 * Bulk delete top20 entries (for admin panel).
 */
export async function DELETE(request: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
          collection: 'top20',
          id,
          depth: 0,
        })

        if (!existing) {
          errors.push({ id, error: 'Not found' })
          continue
        }

        const isOwner = String(existing.submittedBy) === String(user.id)
        const isAdmin = (user as UserWithContext).currentRole === 'member-admin'

        if (!isOwner && !isAdmin) {
          errors.push({ id, error: 'Not authorized' })
          continue
        }

        await payload.delete({ collection: 'top20', id })
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
    console.error('Error deleting top20 entries:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
