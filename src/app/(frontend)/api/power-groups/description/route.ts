import { getPayload } from 'payload'
import { getSettings } from '@/lib/getSiteSettings'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import config from '@/payload.config'
import { sanitizeHtmlContent } from '@/lib/sanitizeHtml'

export async function PATCH(request: Request) {
  try {
    const payload = await getPayload({ config })
    const headers = await getHeaders()
    const { user } = await payload.auth({ headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const host = headers.get('host')
    const site = await getSettings()
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const body = await request.json()
    const { powerGroupId, description } = body

    if (!powerGroupId) {
      return NextResponse.json({ error: 'powerGroupId is required' }, { status: 400 })
    }

    // Find user's membership for this site
    const memberships = await payload.find({
      collection: 'members',
      where: {
        and: [
          { user: { equals: user.id } },
          { status: { equals: 'active' } },
        ],
      },
      limit: 1,
      depth: 0,
    })

    const membership = memberships.docs[0]
    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 403 })
    }

    // Verify user is a power group lead
    if (!membership.powerGroupLead) {
      return NextResponse.json({ error: 'Not a power group lead' }, { status: 403 })
    }

    // Verify the power group matches the user's power group
    const userPowerGroupId =
      typeof membership.powerGroup === 'object'
        ? (membership.powerGroup as any)?.id
        : membership.powerGroup
    if (String(userPowerGroupId) !== String(powerGroupId)) {
      return NextResponse.json({ error: 'Power group mismatch' }, { status: 403 })
    }

    // Verify the power group belongs to this site
    const powerGroup = await payload.findByID({
      collection: 'power-groups',
      id: powerGroupId,
      depth: 0,
    })

    // Sanitize and update
    const sanitizedDescription = sanitizeHtmlContent(description)

    await payload.update({
      collection: 'power-groups',
      id: powerGroupId,
      data: { description: sanitizedDescription },
    })

    return NextResponse.json({ success: true, description: sanitizedDescription })
  } catch (error) {
    console.error('Error updating power group description:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
