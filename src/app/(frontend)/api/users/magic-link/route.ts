import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
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
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Get site and locale from host
    const host = headers.get('host') || 'localhost:3050'
    const site = await getSiteFromHost(host)
    const siteSettings = site ? await getSiteSettingsById(String(site.id)) : null
    const locale: EmailLocale = (site?.locale as EmailLocale) || DEFAULT_LOCALE
    const chapterName = siteSettings?.siteName || site?.name || DEFAULT_ORG_NAME
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

    // Check if user has any active membership (if not superadmin)
    if (!user.isSuperadmin) {
      const memberships = await payload.find({
        collection: 'site-memberships',
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
      siteId: site?.id,
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
