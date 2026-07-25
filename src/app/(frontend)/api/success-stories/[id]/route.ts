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
    const { title, story, businessValue, partnerMember } = await request.json()

    // Verify ownership
    const existing = await payload.findByID({
      collection: 'success-stories',
      id,
      depth: 0,
    })

    if (!existing || String(existing.author) !== String(user.id)) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
    }

    const doc = await payload.update({
      collection: 'success-stories',
      id,
      data: {
        title,
        story,
        businessValue: businessValue || undefined,
        partnerMember: partnerMember || undefined,
      },
    })

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Error updating success story:', error)
    return NextResponse.json({ error: 'Failed to update success story' }, { status: 500 })
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
      collection: 'success-stories',
      id,
      depth: 0,
    })

    if (!existing || String(existing.author) !== String(user.id)) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
    }

    await payload.delete({
      collection: 'success-stories',
      id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting success story:', error)
    return NextResponse.json({ error: 'Failed to delete success story' }, { status: 500 })
  }
}
