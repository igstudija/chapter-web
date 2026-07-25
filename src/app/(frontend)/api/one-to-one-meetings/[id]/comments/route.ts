import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { notifyMeetingComment } from '@/lib/activityNotifications'
import { getCurrentSite, getSiteSettings } from '@/lib/getSiteSettings'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { DEFAULT_ORG_NAME } from '@/lib/branding'
import { DEFAULT_LOCALE } from '@/lib/i18n'

function extractUserId(userOrId: any): string {
  const id = typeof userOrId === 'object' ? userOrId.id : userOrId
  return String(id)
}

function isParticipant(userId: string, createdById: string, metWithId: string): boolean {
  return createdById === userId || metWithId === userId
}

async function notifyOtherParticipant(options: {
  payload: any
  userId: string
  createdById: string
  metWithId: string
  user: any
  existing: any
  text: string
  meetingId: string
  baseUrl: string
  siteSettings: any
  siteId: string | number
  locale: 'lv' | 'en'
  timezone?: string | null
}) {
  const {
    payload,
    userId,
    createdById,
    metWithId,
    user,
    existing,
    text,
    meetingId,
    baseUrl,
    siteSettings,
    siteId,
    locale,
    timezone,
  } = options
  const otherParticipantId = createdById === userId ? metWithId : createdById

  if (!otherParticipantId || otherParticipantId === userId) {
    return
  }

  const otherParticipant = await payload.findByID({
    collection: 'users',
    id: otherParticipantId,
    depth: 0,
  })

  if (!otherParticipant) {
    return
  }

  notifyMeetingComment({
    commenter: {
      id: user.id,
      name: user.name || undefined,
      surname: user.surname || undefined,
      email: user.email,
    },
    otherParticipant: {
      id: otherParticipant.id,
      name: otherParticipant.name || undefined,
      surname: otherParticipant.surname || undefined,
      email: otherParticipant.email,
    },
    meetingDate: existing.date as string,
    commentText: text,
    meetingId,
    baseUrl,
    chapterName: siteSettings?.siteName || DEFAULT_ORG_NAME,
    siteId,
    locale,
    timezone,
  })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })
  const { id } = await params

  const host = headers.get('host') || 'localhost:3050'
  const protocol =
    headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const baseUrl = `${protocol}://${host}`

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentSite = await getCurrentSite()
  if (!currentSite?.enableActivities) {
    return NextResponse.json({ error: 'Activities feature is disabled' }, { status: 403 })
  }
  const siteSettings = await getSiteSettings()

  try {
    const { text } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 })
    }

    const existing = await payload.findByID({
      collection: 'one-to-one-meetings',
      id,
      depth: 0,
    })

    if (!existing) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    const createdById = extractUserId(existing.createdBy)
    const metWithId = extractUserId(existing.metWith)
    const userId = String(user.id)

    if (!isParticipant(userId, createdById, metWithId)) {
      return NextResponse.json({ error: 'Not authorized to comment' }, { status: 403 })
    }

    const newComment = {
      text,
      author: user.id,
      commentCreatedAt: new Date().toISOString(),
    }

    const existingComments = Array.isArray(existing.comments) ? existing.comments : []

    const doc = await payload.update({
      collection: 'one-to-one-meetings',
      id,
      data: {
        comments: [...existingComments, newComment],
      },
      // Override access since we already verified user is participant
      overrideAccess: true,
      // Pass request context so filterOptions can determine the site from hostname
      req: { headers, payload, user } as any,
    })

    await notifyOtherParticipant({
      payload,
      userId,
      createdById,
      metWithId,
      user,
      existing,
      text,
      meetingId: id,
      baseUrl,
      siteSettings,
      siteId: currentSite.id,
      locale: (currentSite.locale as 'lv' | 'en') || DEFAULT_LOCALE,
      timezone: currentSite.timezone,
    })

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Error adding comment:', error)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
}
