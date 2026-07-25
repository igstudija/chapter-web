import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import crypto from 'node:crypto'
import { sendEmail } from '@/lib/sendEmail'
import { generateEmailTemplate } from '@/lib/emailTemplate'
import { getSiteFromHost } from '@/lib/getSiteFromHost'
import { getSiteSettingsById } from '@/lib/getSiteSettings'
import { type EmailLocale, getEmailTranslations } from '@/lib/emailTranslations'
import { DEFAULT_ORG_NAME } from '@/lib/branding'
import { DEFAULT_LOCALE } from '@/lib/i18n'

export async function POST(request: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config })

    // Authenticate user
    const { user } = await payload.auth({ headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { newEmail } = await request.json()

    if (!newEmail) {
      return NextResponse.json({ error: 'New email is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Check if email is same as current
    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json({ error: 'New email is same as current email' }, { status: 400 })
    }

    // Check if email is already in use
    const existingUser = await payload.find({
      collection: 'users',
      where: {
        email: { equals: newEmail.toLowerCase() },
      },
      limit: 1,
    })

    if (existingUser.docs.length > 0) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    // Get site and locale from host
    const host = headers.get('host') || 'localhost:3050'
    const protocol =
      headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
    const baseUrl = `${protocol}://${host}`

    const site = await getSiteFromHost(host)
    const siteSettings = site ? await getSiteSettingsById(String(site.id)) : null
    const locale: EmailLocale = (site?.locale as EmailLocale) || DEFAULT_LOCALE
    const chapterName = siteSettings?.siteName || site?.name || DEFAULT_ORG_NAME
    const t = getEmailTranslations(locale)

    // Generate verification token
    const emailChangeToken = crypto.randomBytes(32).toString('hex')
    const emailChangeExpiry = new Date(Date.now() + 3600000) // 1 hour

    // Save pending email and token
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        pendingEmail: newEmail.toLowerCase(),
        emailChangeToken,
        emailChangeExpiry: emailChangeExpiry.toISOString(),
      },
      overrideAccess: true,
    })

    const verifyUrl = `${baseUrl}/verify-email-change?token=${emailChangeToken}`

    // Send verification email to NEW address
    await sendEmail({
      to: newEmail,
      subject: `${t.emailChange.subject} - ${chapterName}`,
      siteId: site?.id,
      html: generateEmailTemplate({
        title: t.emailChange.title,
        chapterName,
        locale,
        content: `
          <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
            ${t.emailChange.hello} ${user.name || ''},
          </p>
          <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
            ${t.emailChange.requestReceived}
          </p>
          <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px; font-weight: 600;">
            ${newEmail}
          </p>
          <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
            ${t.emailChange.willBeUsername}
          </p>
        `,
        buttonText: t.emailChange.confirmButton,
        buttonUrl: verifyUrl,
        footerNote: `
          <p style="margin: 20px 0 10px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
            ${t.copyLinkNote}
          </p>
          <p style="margin: 0 0 20px 0; color: #3b82f6; font-size: 14px; line-height: 1.5; word-break: break-all;">
            ${verifyUrl}
          </p>
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
            <strong>${t.emailChange.linkExpires}</strong>
          </p>
          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
            ${t.emailChange.ignoreIfNotRequested}
          </p>
        `,
      }),
    })

    // Send notification to OLD email address (security)
    await sendEmail({
      to: user.email,
      subject: `${t.emailChange.notificationSubject} - ${chapterName}`,
      siteId: site?.id,
      html: generateEmailTemplate({
        title: t.emailChange.notificationTitle,
        chapterName,
        locale,
        content: `
          <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
            ${t.emailChange.hello} ${user.name || ''},
          </p>
          <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
            ${t.emailChange.notificationMessage}
          </p>
        `,
        buttonText: '',
        buttonUrl: '',
        footerNote: '',
      }),
    })

    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
      pendingEmail: newEmail,
    })
  } catch (error) {
    console.error('Error in change email:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 },
    )
  }
}

// GET - check if there's a pending email change
export async function GET() {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config })

    const { user } = await payload.auth({ headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get fresh user data with pending email info
    const freshUser = await payload.findByID({
      collection: 'users',
      id: user.id,
    })

    const hasPendingChange =
      freshUser.pendingEmail &&
      freshUser.emailChangeExpiry &&
      new Date(freshUser.emailChangeExpiry) > new Date()

    return NextResponse.json({
      currentEmail: freshUser.email,
      pendingEmail: hasPendingChange ? freshUser.pendingEmail : null,
    })
  } catch (error) {
    console.error('Error getting email status:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}

// DELETE - cancel pending email change
export async function DELETE() {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config })

    const { user } = await payload.auth({ headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        pendingEmail: null,
        emailChangeToken: null,
        emailChangeExpiry: null,
      },
      overrideAccess: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error canceling email change:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
