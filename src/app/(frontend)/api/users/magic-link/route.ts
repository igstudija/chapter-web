import { headers as getHeaders } from 'next/headers'
import { isUserAdmin } from '@/lib/userHelpers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import crypto from 'node:crypto'
import { sendEmail } from '@/lib/sendEmail'
import { generateEmailTemplate } from '@/lib/emailTemplate'
import { getSettings } from '@/lib/getSiteSettings'
import { type EmailLocale, getEmailTranslations } from '@/lib/emailTranslations'
import { DEFAULT_ORG_NAME } from '@/lib/branding'
import { DEFAULT_LOCALE } from '@/lib/i18n'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rateLimit'

export async function POST(request: Request) {
  try {
    const headers = await getHeaders()

    // Unauthenticated and sends mail to whatever address is posted: rate limited
    // so it cannot be used to flood a member's inbox or burn the SMTP quota.
    const rateLimitResult = checkRateLimit(getClientIp(headers), RATE_LIMITS.EMAIL_TRIGGER)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 900),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          },
        },
      )
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    const host = headers.get('host') || 'localhost:3050'
    const settings = await getSettings()
    const locale: EmailLocale = (settings?.locale as EmailLocale) || DEFAULT_LOCALE
    const chapterName = settings?.siteName || DEFAULT_ORG_NAME
    const t = getEmailTranslations(locale)

    const users = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email.toLowerCase(),
        },
      },
      limit: 1,
    })

    if (users.docs.length === 0) {
      return NextResponse.json(
        { message: 'If an account exists with this email, a login link has been sent.' },
        { status: 200 },
      )
    }

    const user = users.docs[0]

    // Administrators can always sign in; everyone else needs a member profile
    if (!isUserAdmin(user)) {
      const memberships = await payload.find({
        collection: 'members',
        where: {
          user: { equals: user.id },
          status: { equals: 'active' },
        },
        limit: 1,
      })

      if (memberships.docs.length === 0) {
        // User has no active memberships - still return generic message for security
        return NextResponse.json(
          { message: 'If an account exists with this email, a login link has been sent.' },
          { status: 200 },
        )
      }
    }

    const magicToken = crypto.randomBytes(32).toString('hex')
    const magicTokenExpiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        magicLinkToken: magicToken,
        magicLinkExpiry: magicTokenExpiry.toISOString(),
      },
      overrideAccess: true,
    })

    // Get the base URL from request headers (works for both localhost and production)
    const protocol =
      headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
    const baseUrl = `${protocol}://${host}`

    const magicUrl = `${baseUrl}/magic-link-verify?token=${magicToken}`

    await sendEmail({
      to: email,
      subject: `${t.magicLink.subject} - ${chapterName}`,
      html: generateEmailTemplate({
        title: t.magicLink.title,
        chapterName,
        locale,
        content: `
          <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
            ${t.magicLink.hello} ${user.name || ''},
          </p>
          <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
            ${t.magicLink.clickToSignIn}
          </p>
        `,
        buttonText: t.magicLink.signInButton,
        buttonUrl: magicUrl,
        footerNote: `
          <p style="margin: 20px 0 10px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
            ${t.copyLinkNote}
          </p>
          <p style="margin: 0 0 20px 0; color: #3b82f6; font-size: 14px; line-height: 1.5; word-break: break-all;">
            ${magicUrl}
          </p>
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
            <strong>${t.magicLink.linkExpires}</strong>
          </p>
          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
            ${t.magicLink.ignoreIfNotRequested}
          </p>
        `,
      }),
    })

    return NextResponse.json(
      { message: 'If an account exists with this email, a login link has been sent.' },
      { status: 200 },
    )
  } catch (error) {
    console.error('Error in magic link request:', error)
    return NextResponse.json(
      { message: 'An error occurred. Please try again later.' },
      { status: 500 },
    )
  }
}
