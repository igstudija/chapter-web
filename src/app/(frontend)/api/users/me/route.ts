import { headers as getHeaders } from 'next/headers'
import { getSettings } from '@/lib/getSiteSettings'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { MAX_SLIDE_IMAGES } from '@/lib/buildSlides'

export const dynamic = 'force-dynamic'

/**
 * Coerce whatever the client sent for a relationship — id, numeric string, or
 * populated doc — into the numeric id Postgres needs. `null` for "no relation".
 */
function toRelationId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isNaN(value) ? null : value
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  if (typeof value === 'object' && 'id' in value) {
    return toRelationId((value as { id: unknown }).id)
  }
  return null
}

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
  const memberships = await payload.find({
    collection: 'members',
    where: { user: { equals: user.id } },
    limit: 1,
    depth: 1,
  })
  const membership = memberships.docs[0] || null

  return NextResponse.json({ user, membership })
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
    // Check if updating membership fields
    const membershipFields = [
      'tyfcbGiven',
      'tyfcbReceived',
      'slideImage',
      'slideImages',
      'slideMediaType',
      'slideVideoUrl',
      'slideTemplate',
      'slideSpecialRequestDisplay',
      'slideNextSpeakerPosition',
      'slideBackgroundColor',
      'slideBackgroundColorRight',
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
      const memberships = await payload.find({
        collection: 'members',
        where: { user: { equals: user.id } },
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
          } else if (field === 'slideImages') {
            // Upload relations need numeric IDs on Postgres; the browser sends
            // them as strings. Drop anything that isn't an ID.
            const value = data[field]
            membershipUpdateData[field] = Array.isArray(value)
              ? value
                  .map(toRelationId)
                  .filter((id): id is number => id !== null)
                  .slice(0, MAX_SLIDE_IMAGES)
              : []
          } else if (field === 'slideImage') {
            membershipUpdateData[field] = toRelationId(data[field])
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
