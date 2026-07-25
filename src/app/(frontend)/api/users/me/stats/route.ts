import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'

export async function PATCH(request: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { revenueReceived, referralsReceivedCount, referralsGivenCount, tyfcbGiven } =
      await request.json()

    const updateData: Record<string, number> = {}

    if (revenueReceived !== undefined) {
      updateData.revenueReceived = Number(revenueReceived) || 0
    }
    if (referralsReceivedCount !== undefined) {
      updateData.referralsReceivedCount = Number(referralsReceivedCount) || 0
    }
    if (referralsGivenCount !== undefined) {
      updateData.referralsGivenCount = Number(referralsGivenCount) || 0
    }
    if (tyfcbGiven !== undefined) {
      updateData.tyfcbGiven = Number(tyfcbGiven) || 0
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const doc = await payload.update({
      collection: 'users',
      id: user.id,
      data: updateData,
    })

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Error updating stats:', error)
    return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 })
  }
}
