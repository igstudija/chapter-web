import nodemailer from 'nodemailer'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { DEFAULT_ORG_NAME } from '@/lib/branding'

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  siteId,
}: {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: string
    encoding: string
    contentType: string
  }>
  siteId?: string | number
}) {
  try {
    // A wrong From: address is silently dropped by most providers, so an
    // unconfigured install should be obvious in the logs rather than mysterious.
    if (!process.env.EMAIL_FROM) {
      console.warn('[email] EMAIL_FROM is not set; falling back to noreply@localhost')
    }
    let emailFrom = process.env.EMAIL_FROM || 'noreply@localhost'
    let emailFromName = process.env.EMAIL_FROM_NAME || DEFAULT_ORG_NAME

    if (siteId) {
      try {
        const payload = await getPayload({ config })
        const siteSettings = await payload.find({
          collection: 'settings',
          where: { site: { equals: siteId } },
          limit: 1,
        })

        if (siteSettings.docs[0]) {
          emailFrom = siteSettings.docs[0].emailFrom || emailFrom
          emailFromName = siteSettings.docs[0].emailFromName || emailFromName
        }
      } catch (error) {
        console.warn('Failed to load site email settings, using defaults:', error)
      }
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const info = await transporter.sendMail({
      from: `"${emailFromName}" <${emailFrom}>`,
      to,
      subject,
      html,
      attachments,
    })

    console.log('Email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}
