import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })
  const { id } = await params

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { request: requestText, registrationNumber, showOnSlide, sortOrder, chapterOnly } = body

    // Verify ownership
    const existing = await payload.findByID({
      collection: 'special-requests',
      id,
      depth: 0,
    })

    if (!existing || String(existing.requestedBy) !== String(user.id)) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
    }

    // Only one request per member may be featured on the slide: clear the flag
    // on the member's other requests before enabling it here.
    if (showOnSlide === true) {
      await payload.update({
        collection: 'special-requests',
        where: {
          and: [{ requestedBy: { equals: user.id } }, { id: { not_equals: id } }],
        },
        data: { showOnSlide: false },
        overrideAccess: true,
        req: { headers, payload, user } as any,
      })
    }

    // Build a partial update so toggle/reorder calls don't blank out other fields.
    const data: Record<string, unknown> = {}
    if (typeof requestText === 'string') data.request = requestText
    if ('registrationNumber' in body) data.registrationNumber = registrationNumber || undefined
    if (typeof showOnSlide === 'boolean') data.showOnSlide = showOnSlide
    if (typeof sortOrder === 'number') data.sortOrder = sortOrder
    if (typeof chapterOnly === 'boolean') data.chapterOnly = chapterOnly

    const doc = await payload.update({
      collection: 'special-requests',
      id,
      data,
      // Override access since we already verified ownership above
      overrideAccess: true,
      // Pass request context so filterOptions can determine the site from hostname
      req: { headers, payload, user } as any,
    })

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Error updating special request:', error)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
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

  try {
    // Verify ownership
    const existing = await payload.findByID({
      collection: 'special-requests',
      id,
      depth: 0,
    })

    if (!existing || String(existing.requestedBy) !== String(user.id)) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
    }

    await payload.delete({
      collection: 'special-requests',
      id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting special request:', error)
    return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 })
  }
}
