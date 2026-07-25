import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { getSiteFromHost } from '@/lib/getSiteFromHost'

/**
 * POST /api/success-stories
 *
 * Creates a success story for the current site.
 * SECURITY: Site is ALWAYS determined from hostname - never from request body.
 */
export async function POST(request: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { title, story, businessValue, partnerMember } = await request.json()

    // SECURITY: Always use hostname for site detection - never accept siteId from client
    const host = headers.get('host')
    const currentSite = await getSiteFromHost(host)
    const currentSiteId = currentSite?.id || null

    if (!currentSiteId) {
      return NextResponse.json({ error: 'Site not found' }, { status: 400 })
    }

    if (!title || !story) {
      return NextResponse.json({ error: 'Title and story are required' }, { status: 400 })
    }

    const doc = await payload.create({
      collection: 'success-stories',
      data: {
        title,
        story,
        businessValue: businessValue || undefined,
        partnerMember: partnerMember || undefined,
        author: user.id,
        site: currentSiteId,
        isPublic: true,
      },
    })

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Error creating success story:', error)
    return NextResponse.json({ error: 'Failed to create success story' }, { status: 500 })
  }
}

/**
 * DELETE /api/success-stories
 *
 * Bulk delete success stories (for admin panel).
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
          collection: 'success-stories',
          id,
          depth: 0,
        })

        if (!existing) {
          errors.push({ id, error: 'Not found' })
          continue
        }

        const isOwner = String(existing.author) === String(user.id)
        const isAdmin = (user as UserWithContext).currentRole === 'member-admin'

        if (!isOwner && !isAdmin) {
          errors.push({ id, error: 'Not authorized' })
          continue
        }

        await payload.delete({ collection: 'success-stories', id })
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
    console.error('Error deleting success stories:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
