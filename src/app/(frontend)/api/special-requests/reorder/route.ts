import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'

/**
 * Persist a new drag-and-drop ordering for the current member's special requests.
 * Body: { ids: (string | number)[] } — the request IDs in their new top-to-bottom order.
 * Each request's `sortOrder` is set to its index in the array.
 */
export async function PATCH(request: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { ids } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
    }

    // Only allow reordering the caller's own requests.
    const owned = await payload.find({
      collection: 'special-requests',
      where: { requestedBy: { equals: user.id } },
      limit: 1000,
      depth: 0,
    })
    const ownedIds = new Set(owned.docs.map((d) => String(d.id)))

    if (!ids.every((id) => ownedIds.has(String(id)))) {
      return NextResponse.json({ error: 'Not authorized for one or more requests' }, { status: 403 })
    }

    await Promise.all(
      ids.map((id, index) =>
        payload.update({
          collection: 'special-requests',
          id,
          data: { sortOrder: index },
          overrideAccess: true,
          req: { headers, payload, user } as any,
        }),
      ),
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering special requests:', error)
    return NextResponse.json({ error: 'Failed to reorder requests' }, { status: 500 })
  }
}
