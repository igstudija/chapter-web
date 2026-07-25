import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { notifyReferralStatusUpdated } from '@/lib/activityNotifications'
import { getSettings } from '@/lib/getSiteSettings'
import { isUserActive, isUserAdmin, type UserWithContext } from '@/lib/userHelpers'
import { DEFAULT_ORG_NAME } from '@/lib/branding'
import { DEFAULT_LOCALE } from '@/lib/i18n'

// PATCH - Update referral status (only receiver can update)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  // Get base URL from request headers
  const host = headers.get('host') || 'localhost:3050'
  const protocol = headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const baseUrl = `${protocol}://${host}`

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if activities feature is enabled
  const currentSite = await getSettings()
  if (!currentSite?.enableActivities) {
    return NextResponse.json({ error: 'Activities feature is disabled' }, { status: 403 })
  }
  const siteSettings = await getSettings()

  const { id } = await params

  try {
    // Get the referral first
    const referral = await payload.findByID({
      collection: 'referrals',
      id,
      depth: 0,
    })

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    // Only the receiver (toUser) can update the status
    const toUserId = typeof referral.toUser === 'object' ? referral.toUser.id : referral.toUser
    if (toUserId !== user.id && !isUserAdmin(user as UserWithContext)) {
      return NextResponse.json(
        { error: 'Only the referral receiver can update the status' },
        { status: 403 }
      )
    }

    // Only pending referrals can be updated
    if (referral.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending referrals can be updated' },
        { status: 400 }
      )
    }

    const { status, value } = await request.json()

    if (!status || !['success', 'failed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // If marking as success, value is required
    if (status === 'success' && (!value || value <= 0)) {
      return NextResponse.json(
        { error: 'Business value is required for successful referrals' },
        { status: 400 }
      )
    }

    const updateData: { status: 'success' | 'failed'; value?: number } = {
      status: status as 'success' | 'failed',
    }
    if (status === 'success' && value) {
      updateData.value = Number(value)
    }

    const doc = await payload.update({
      collection: 'referrals',
      id,
      data: updateData,
      // Override access since we already verified user is receiver
      overrideAccess: true,
      // Pass request context so filterOptions can determine the site from hostname
      req: { headers, payload, user } as any,
    })

    // Notify fromUser about the status update
    const fromUserId = typeof referral.fromUser === 'object' ? referral.fromUser.id : referral.fromUser

    if (fromUserId && fromUserId !== user.id) {
      const fromUserData = await payload.findByID({
        collection: 'users',
        id: fromUserId,
        depth: 0,
      })

      if (fromUserData) {
        notifyReferralStatusUpdated({
          fromUser: {
            id: fromUserData.id,
            name: fromUserData.name || undefined,
            surname: fromUserData.surname || undefined,
            email: fromUserData.email,
          },
          toUser: {
            id: user.id,
            name: user.name || undefined,
            surname: user.surname || undefined,
            email: user.email,
          },
          description: referral.description as string,
          status: status as 'success' | 'failed',
          value: status === 'success' ? Number(value) : undefined,
          referralId: id,
          baseUrl,
          chapterName: siteSettings?.siteName || DEFAULT_ORG_NAME,
          siteId: currentSite.id,
          locale: (currentSite.locale as 'lv' | 'en') || DEFAULT_LOCALE,
          timezone: currentSite.timezone,
        })
      }
    }

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Error updating referral status:', error)
    return NextResponse.json({ error: 'Failed to update referral status' }, { status: 500 })
  }
}
