import { headers as getHeaders } from 'next/headers'
import { getSettings } from '@/lib/getSiteSettings'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/me
 *
 * Returns current user and their membership for the current site.
 * Site is ALWAYS determined from hostname - never from query params.
 * This is a security measure to prevent cross-site data access.
 */
export async function GET() {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const settings = await getSettings()
  const currentSiteId = settings?.id || null

  let membership = null
  if (currentSiteId) {
    const memberships = await payload.find({
      collection: 'members',
      where: {
        and: [{ user: { equals: user.id } }, { site: { equals: currentSiteId } }],
      },
      limit: 1,
      depth: 1,
    })
    membership = memberships.docs[0] || null
  }

  return NextResponse.json({ user, membership, siteId: currentSiteId })
}

/**
 * PATCH /api/users/me
 *
 * Updates current user and their membership for the current site.
 * Site is ALWAYS determined from hostname - never from request body.
 * This is a security measure to prevent cross-site data modification.
 */
export async function PATCH(request: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const settings = await getSettings()
    const currentSiteId = settings?.id || null

    // Check if updating membership fields
    const membershipFields = [
      'tyfcbGiven',
      'tyfcbReceived',
      'slideImage',
      'slideBackgroundColor',
      'slideImageMode',
      'company',
      'phone',
      'website',
      'jobPosition',
      'orgRole',
      'companyDescription',
      'profileImage',
      'logo',
      'gallery',
      'description',
      'companyPhone',
      'companyEmail',
      'country',
      'powerGroup',
    ]
    const hasMembershipFields = membershipFields.some((field) => data[field] !== undefined)

    if (hasMembershipFields) {
      if (!currentSiteId) {
        return NextResponse.json({ error: 'Site not found' }, { status: 404 })
      }

      // Find user's membership for current site
      const memberships = await payload.find({
        collection: 'members',
        where: {
          and: [{ user: { equals: user.id } }, { site: { equals: currentSiteId } }],
        },
        limit: 1,
        depth: 0,
      })

      const membership = memberships.docs[0]
      if (!membership) {
        return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
      }

      // Update membership - only allowed fields
      const membershipUpdateData: Record<string, unknown> = {}
      for (const field of membershipFields) {
        if (data[field] !== undefined) {
          // Handle relationship fields - extract ID and convert to number for Postgres
          if (field === 'powerGroup') {
            const value = data[field]
            // powerGroup can be null (to clear), string/number ID, or object with id
            if (value === null || value === '') {
              membershipUpdateData[field] = null
            } else if (typeof value === 'string') {
              // Convert string ID to number for Postgres
              const numId = Number.parseInt(value, 10)
              if (!Number.isNaN(numId)) {
                membershipUpdateData[field] = numId
              }
            } else if (typeof value === 'number') {
              membershipUpdateData[field] = value
            } else if (typeof value === 'object' && value?.id) {
              // Extract ID from object and convert to number
              const numId = typeof value.id === 'number' ? value.id : Number.parseInt(value.id, 10)
              if (!Number.isNaN(numId)) {
                membershipUpdateData[field] = numId
              }
            }
            // Skip invalid values
          } else {
            membershipUpdateData[field] = data[field]
          }
        }
      }

      await payload.update({
        collection: 'members',
        id: membership.id,
        data: membershipUpdateData,
      })
    }

    // Update user fields if provided (only global user fields: name, surname)
    const userUpdateData: Record<string, unknown> = {}
    if (data.name !== undefined) userUpdateData.name = data.name
    if (data.surname !== undefined) userUpdateData.surname = data.surname

    if (Object.keys(userUpdateData).length > 0) {
      await payload.update({
        collection: 'users',
        id: user.id,
        data: userUpdateData,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to update profile', details: errorMessage },
      { status: 500 },
    )
  }
}
