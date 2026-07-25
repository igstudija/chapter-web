import type { CollectionConfig } from 'payload'
import {
  siteScopedAdmin,
  siteFieldAccess,
  siteBasedListFilter,
  autoAssignSiteHook,
} from '../access/multisite'
import { hideOnSuperadminPanel } from '../access/adminVisibility'
import { sendEmail } from '../lib/sendEmail'
import { generateEmailTemplate } from '../lib/emailTemplate'
import {
  type EmailLocale,
  getEmailTranslations,
  formatDateTimeForEmail,
  DEFAULT_EMAIL_TIMEZONE,
} from '../lib/emailTranslations'
import { DEFAULT_ORG_NAME } from '../lib/branding'
import { DEFAULT_LOCALE } from '../lib/i18n'

export const EventSubmissions: CollectionConfig = {
  slug: 'event-submissions',
  labels: {
    singular: 'Event Submission',
    plural: 'Event Submissions',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'eventTitle', 'createdAt'],
    group: 'Submissions',
    hidden: hideOnSuperadminPanel,
    baseListFilter: siteBasedListFilter,
    components: {
      beforeListTable: ['@/components/admin/ExportToExcelButton'],
    },
  },
  access: {
    read: siteScopedAdmin,
    create: siteScopedAdmin, // Public submissions go through /api/event-submissions with overrideAccess
    update: siteScopedAdmin,
    delete: siteScopedAdmin,
  },
  hooks: {
    beforeValidate: [async (args) => autoAssignSiteHook(args)],
    beforeChange: [
      // Snapshot the event title so the registration keeps a readable
      // reference after the event itself is deleted.
      async ({ data, req, operation }) => {
        if (operation !== 'create' || !data?.event || data.eventTitle) return data
        const eventId = typeof data.event === 'object' ? data.event?.id : data.event
        if (!eventId) return data
        try {
          const event = await req.payload.findByID({
            collection: 'events',
            id: eventId,
            depth: 0,
          })
          if (event?.title) data.eventTitle = event.title
        } catch {
          // Registration must not fail because of a missing snapshot
        }
        return data
      },
    ],
    afterChange: [
      async ({ operation, doc, req }) => {
        // Send email notification to admin and submitter on new submission
        if (operation === 'create') {
          const { payload } = req

          // Get site settings from collection by site ID
          const siteId = typeof doc.site === 'object' ? doc.site?.id : doc.site
          let siteSettings = null
          let site = null

          if (siteId) {
            // Get site for locale
            site = await payload.findByID({
              collection: 'sites',
              id: siteId,
            })

            const settingsResult = await payload.find({
              collection: 'site-settings-collection',
              where: { site: { equals: siteId } },
              limit: 1,
            })
            siteSettings = settingsResult.docs[0] || null
          }

          const adminEmails = siteSettings?.adminEmails || []
          const chapterName = siteSettings?.siteName || DEFAULT_ORG_NAME
          const locale: EmailLocale = (site?.locale as EmailLocale) || DEFAULT_LOCALE
          const t = getEmailTranslations(locale)
          const dateLocale = locale === 'lv' ? 'lv-LV' : 'en-US'
          const timezone = site?.timezone || DEFAULT_EMAIL_TIMEZONE

          // Get event details
          if (!doc.event) return
          const event =
            typeof doc.event === 'object'
              ? doc.event
              : await payload.findByID({
                  collection: 'events',
                  id: doc.event,
                })

          if (typeof event === 'object') {
            const eventTitle = event.title
            const eventDate = new Date(event.date)
            const eventEndDate = event.endDate
              ? new Date(event.endDate)
              : new Date(eventDate.getTime() + 2 * 60 * 60 * 1000) // Default 2 hours
            const eventLocation = event.location || 'TBA'

            // Generate .ics calendar file content
            const formatICSDate = (date: Date) => {
              return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
            }

            const icsContent = [
              'BEGIN:VCALENDAR',
              'VERSION:2.0',
              `PRODID:-//${chapterName}//Event Registration//${locale.toUpperCase()}`,
              'CALSCALE:GREGORIAN',
              'METHOD:REQUEST',
              'BEGIN:VEVENT',
              `UID:${doc.id}@${site?.domain || 'localhost'}`,
              `DTSTAMP:${formatICSDate(new Date())}`,
              `DTSTART:${formatICSDate(eventDate)}`,
              `DTEND:${formatICSDate(eventEndDate)}`,
              `SUMMARY:${eventTitle}`,
              `DESCRIPTION:${t.event.registrationConfirmed} ${eventTitle}`,
              `LOCATION:${eventLocation}`,
              'STATUS:CONFIRMED',
              'SEQUENCE:0',
              'BEGIN:VALARM',
              'TRIGGER:-PT1H',
              'ACTION:DISPLAY',
              `DESCRIPTION:${t.event.reminder}`,
              'END:VALARM',
              'END:VEVENT',
              'END:VCALENDAR',
            ].join('\r\n')

            const icsBuffer = Buffer.from(icsContent).toString('base64')

            try {
              // Send to all admin emails (notification only, no calendar invite)
              for (const adminEmailObj of adminEmails) {
                await sendEmail({
                  to: adminEmailObj.email,
                  subject: `${t.event.adminSubject}: ${eventTitle}`,
                  siteId,
                  html: generateEmailTemplate({
                    title: t.event.adminTitle,
                    chapterName,
                    locale,
                    content: `
                      <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
                        ${t.event.wantsToParticipate}
                      </p>
                      <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                        <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>${t.event.eventLabel}:</strong> ${eventTitle}</p>
                        <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>${t.event.date}:</strong> ${eventDate.toLocaleString(dateLocale, { timeZone: timezone, timeZoneName: 'short' })}</p>
                        <p style="margin: 0; color: #1f2937; font-size: 16px;"><strong>${t.event.location}:</strong> ${eventLocation}</p>
                      </div>
                      <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${t.event.registrantDetails}:</p>
                      <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 16px;"><strong>${t.event.name}:</strong> ${doc.name}</p>
                      <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 16px;"><strong>${t.event.email}:</strong> ${doc.email}</p>
                      ${doc.phone ? `<p style="margin: 0 0 10px 0; color: #4b5563; font-size: 16px;"><strong>${t.event.phone}:</strong> ${doc.phone}</p>` : ''}
                      ${doc.company ? `<p style="margin: 0 0 10px 0; color: #4b5563; font-size: 16px;"><strong>${t.event.company}:</strong> ${doc.company}</p>` : ''}
                      ${doc.invitedBy ? `<p style="margin: 0 0 10px 0; color: #4b5563; font-size: 16px;"><strong>${t.event.invitedBy}:</strong> ${doc.invitedBy}</p>` : ''}
                      ${doc.message ? `<p style="margin: 0 0 10px 0; color: #4b5563; font-size: 16px;"><strong>${t.event.message}:</strong><br>${doc.message}</p>` : ''}
                      <p style="margin: 0; color: #6b7280; font-size: 14px;">${t.event.submitted}: ${new Date(doc.createdAt).toLocaleString(dateLocale, { timeZone: timezone, timeZoneName: 'short' })}</p>
                    `,
                    buttonText: t.event.viewInAdmin,
                    buttonUrl: `${process.env.PAYLOAD_PUBLIC_SERVER_URL}/admin/collections/event-submissions/${doc.id}`,
                  }),
                })
              }

              // Send confirmation email to submitter with calendar invite
              await sendEmail({
                to: doc.email,
                subject: `${t.event.userSubject}: ${eventTitle}`,
                siteId,
                html: generateEmailTemplate({
                  title: t.event.userTitle,
                  chapterName,
                  locale,
                  content: `
                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
                      ${t.event.userGreeting} ${doc.name},
                    </p>
                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
                      ${t.event.registrationConfirmed} <strong>${eventTitle}</strong> ${t.event.hasBeenConfirmed}
                    </p>
                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                      <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${t.event.eventDetails}:</p>
                      <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>${t.event.date}:</strong> ${formatDateTimeForEmail(event.date, locale, timezone)}</p>
                      <p style="margin: 0; color: #1f2937; font-size: 16px;"><strong>${t.event.location}:</strong> ${eventLocation}</p>
                    </div>
                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
                      ${t.event.calendarNote}
                    </p>
                    <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
                      ${t.event.lookForward}
                    </p>
                  `,
                }),
                attachments: [
                  {
                    filename: 'event.ics',
                    content: icsBuffer,
                    encoding: 'base64',
                    contentType: 'text/calendar; charset=utf-8; method=REQUEST',
                  },
                ],
              })
            } catch (error) {
              console.error('Failed to send event submission notification emails:', error)
            }
          }
        }
      },
    ],
  },
  fields: [
    {
      name: 'site',
      type: 'relationship',
      relationTo: 'sites',
      required: false,
      hasMany: false,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'The organisation this submission belongs to',
        condition: (data, siblingData, { user }) => user?.isSuperadmin === true,
      },
      access: {
        update: siteFieldAccess,
      },
    },
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      // Optional so deleting an event doesn't block on its registrations —
      // the DB clears this via ON DELETE SET NULL; eventTitle keeps the reference.
      required: false,
      hasMany: false,
      admin: {
        position: 'sidebar',
        description: 'Cleared automatically if the event is deleted',
      },
      // Disable Payload's built-in relationship validation
      // Our API route validates the event before creating the submission
      validate: () => true,
    },
    {
      name: 'eventTitle',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Snapshot of the event title — kept even after the event is deleted',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Full name of the person registering',
      },
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      admin: {
        description: 'Optional phone number',
      },
    },
    {
      name: 'company',
      type: 'text',
      admin: {
        description: 'Optional company name',
      },
    },
    {
      name: 'invitedBy',
      type: 'text',
      admin: {
        description: 'Optional — who invited the registrant',
      },
    },
    {
      name: 'message',
      type: 'textarea',
      admin: {
        description: 'Optional message or questions',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
