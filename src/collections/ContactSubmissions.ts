import type { CollectionConfig, Payload } from 'payload'
import { adminOnly, adminFieldAccess } from '../access'
import { sendEmail } from '../lib/sendEmail'
import { generateEmailTemplate } from '../lib/emailTemplate'
import {
  type EmailLocale,
  getEmailTranslations,
  DEFAULT_EMAIL_TIMEZONE,
} from '../lib/emailTranslations'
import { DEFAULT_ORG_NAME } from '../lib/branding'
import { DEFAULT_LOCALE } from '../lib/i18n'

interface SiteData {
  siteSettings: any
  adminEmails: any[]
  chapterName: string
  locale: EmailLocale
  dateLocale: string
  timezone: string
}

async function getSiteData(payload: Payload): Promise<SiteData | null> {
  const settingsResult = await payload.find({ collection: 'settings', limit: 1 })
  const siteSettings = settingsResult.docs[0] || null

  const adminEmails = siteSettings?.adminEmails || []
  const chapterName = siteSettings?.siteName || DEFAULT_ORG_NAME
  const locale: EmailLocale = (siteSettings?.locale as EmailLocale) || DEFAULT_LOCALE
  const dateLocale = locale === 'lv' ? 'lv-LV' : 'en-US'
  const timezone = siteSettings?.timezone || DEFAULT_EMAIL_TIMEZONE

  return { siteSettings, adminEmails, chapterName, locale, dateLocale, timezone }
}

async function sendAdminNotifications(doc: any, siteData: SiteData): Promise<void> {
  const { adminEmails, chapterName, locale, dateLocale, timezone } = siteData
  const t = getEmailTranslations(locale)

  for (const adminEmailObj of adminEmails) {
    await sendEmail({
      to: adminEmailObj.email,
      subject: `${t.contact.adminSubject}: ${doc.subject}`,
      html: generateEmailTemplate({
        title: t.contact.adminTitle,
        chapterName,
        locale,
        content: `
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>${t.contact.subject}:</strong> ${doc.subject}</p>
          </div>
          <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${t.contact.contactDetails}:</p>
          <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 16px;"><strong>${t.contact.name}:</strong> ${doc.name}</p>
          <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 16px;"><strong>${t.contact.email}:</strong> ${doc.email}</p>
          ${doc.phone ? `<p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px;"><strong>${t.contact.phone}:</strong> ${doc.phone}</p>` : '<div style="margin-bottom: 20px;"></div>'}
          <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${t.contact.message}:</p>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.5; white-space: pre-wrap;">${doc.message}</p>
          </div>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">${t.contact.submitted}: ${new Date(doc.createdAt).toLocaleString(dateLocale, { timeZone: timezone, timeZoneName: 'short' })}</p>
        `,
        buttonText: t.contact.viewInAdmin,
        buttonUrl: `${process.env.PAYLOAD_PUBLIC_SERVER_URL}/admin/collections/contact-submissions/${doc.id}`,
      }),
    })
  }
}

async function sendUserConfirmation(doc: any, siteData: SiteData, siteId: string): Promise<void> {
  const { chapterName, locale } = siteData
  const t = getEmailTranslations(locale)

  await sendEmail({
    to: doc.email,
    subject: t.contact.userSubject,
    html: generateEmailTemplate({
      title: t.contact.userTitle,
      chapterName,
      locale,
      content: `
        <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
          ${t.contact.userGreeting} ${doc.name},
        </p>
        <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
          ${t.contact.userMessage}
        </p>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${t.contact.yourMessage}:</p>
          <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>${t.contact.subject}:</strong> ${doc.subject}</p>
          <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.5; white-space: pre-wrap;">${doc.message}</p>
        </div>
      `,
    }),
  })
}

export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'subject', 'createdAt'],
    group: 'Submissions',
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    read: adminOnly,
    create: () => true,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    afterChange: [
      async ({ operation, doc, req }) => {
        if (operation !== 'create') return

        const siteId = typeof doc.site === 'object' ? doc.site?.id : doc.site
        if (!siteId) return

        try {
          const siteData = await getSiteData(req.payload)
          if (!siteData || siteData.adminEmails.length === 0) return

          await sendAdminNotifications(doc, siteData)
          await sendUserConfirmation(doc, siteData, siteId)
        } catch (error) {
          console.error('Failed to send contact submission notification emails:', error)
        }
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'New', value: 'new' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Resolved', value: 'resolved' },
      ],
      defaultValue: 'new',
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
