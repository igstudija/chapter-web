import { sendEmail } from './sendEmail'
import { generateEmailTemplate } from './emailTemplate'
import { type EmailLocale, getEmailTranslations, formatDateForEmail } from './emailTranslations'

interface User {
  id: string | number
  name?: string
  surname?: string
  email: string
}

interface MeetingNotificationData {
  creator: User
  metWith: User
  invitedBy: User
  location: string
  topics: string
  date: string
  meetingId: string | number
  baseUrl: string
  chapterName: string
  locale?: EmailLocale
  siteId?: string | number
  timezone?: string | null
}

interface ReferralNotificationData {
  creator: User
  fromUser: User
  toUser: User
  description: string
  date: string
  value?: number
  referralId: string | number
  baseUrl: string
  chapterName: string
  locale?: EmailLocale
  siteId?: string | number
  timezone?: string | null
}

interface CommentNotificationData {
  commenter: User
  otherParticipant: User
  meetingDate: string
  commentText: string
  meetingId: string | number
  baseUrl: string
  chapterName: string
  locale?: EmailLocale
  siteId?: string | number
  timezone?: string | null
}

interface ReferralStatusNotificationData {
  fromUser: User
  toUser: User
  description: string
  status: 'success' | 'failed'
  value?: number
  referralId: string
  baseUrl: string
  chapterName: string
  locale?: EmailLocale
  siteId?: string | number
  timezone?: string | null
}

function getUserFullName(user: User, locale: EmailLocale): string {
  const t = getEmailTranslations(locale)
  return `${user.name || ''} ${user.surname || ''}`.trim() || t.user
}

// ================== 1-2-1 MEETINGS ==================

/**
 * Notify metWith user about new meeting
 */
export async function notifyMeetingCreated(data: MeetingNotificationData): Promise<void> {
  const {
    creator,
    metWith,
    invitedBy,
    location,
    topics,
    date,
    baseUrl,
    chapterName,
    locale = 'lv',
    siteId,
    timezone,
  } = data

  const t = getEmailTranslations(locale)
  const creatorName = getUserFullName(creator, locale)
  const invitedByName = getUserFullName(invitedBy, locale)
  const metWithName = getUserFullName(metWith, locale)

  try {
    await sendEmail({
      to: metWith.email,
      subject: `${t.activity.meetingCreatedSubject} - ${chapterName}`,
      siteId,
      html: generateEmailTemplate({
        title: t.activity.meetingCreatedTitle,
        chapterName,
        locale,
        content: `
          <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
            ${t.greeting}, ${metWithName}!
          </p>
          <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
            <strong>${creatorName}</strong> ${t.activity.meetingRegistered}
          </p>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>${t.activity.meetingDate}:</strong> ${formatDateForEmail(date, locale, timezone)}</p>
            <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>${t.activity.meetingLocation}:</strong> ${location}</p>
            <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>${t.activity.meetingInvitedBy}:</strong> ${invitedByName}</p>
            <p style="margin: 0; color: #1f2937; font-size: 16px;"><strong>${t.activity.meetingTopics}:</strong></p>
            <p style="margin: 5px 0 0 0; color: #4b5563; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${topics}</p>
          </div>
          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
            ${t.activity.meetingCanComment}
          </p>
        `,
        buttonText: t.activity.viewActivities,
        buttonUrl: `${baseUrl}/my-profile/activities`,
      }),
    })
  } catch (error) {
    console.error('Failed to send meeting created notification:', error)
  }
}

/**
 * Notify other participant about new comment
 */
export async function notifyMeetingComment(data: CommentNotificationData): Promise<void> {
  const {
    commenter,
    otherParticipant,
    meetingDate,
    commentText,
    baseUrl,
    chapterName,
    locale = 'lv',
    siteId,
    timezone,
  } = data

  const t = getEmailTranslations(locale)
  const commenterName = getUserFullName(commenter, locale)
  const otherParticipantName = getUserFullName(otherParticipant, locale)

  try {
    await sendEmail({
      to: otherParticipant.email,
      subject: `${t.activity.commentSubject} - ${chapterName}`,
      siteId,
      html: generateEmailTemplate({
        title: t.activity.commentTitle,
        chapterName,
        locale,
        content: `
          <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
            ${t.greeting}, ${otherParticipantName}!
          </p>
          <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
            <strong>${commenterName}</strong> ${t.activity.commentAdded} (${formatDateForEmail(meetingDate, locale, timezone)}).
          </p>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.5; white-space: pre-wrap;">"${commentText}"</p>
          </div>
        `,
        buttonText: t.activity.viewActivities,
        buttonUrl: `${baseUrl}/my-profile/activities`,
      }),
    })
  } catch (error) {
    console.error('Failed to send meeting comment notification:', error)
  }
}

// ================== REFERRALS ==================

/**
 * Notify toUser about new referral they received
 */
export async function notifyReferralCreated(data: ReferralNotificationData): Promise<void> {
  const {
    fromUser,
    toUser,
    description,
    date,
    value,
    baseUrl,
    chapterName,
    locale = 'lv',
    siteId,
    timezone,
  } = data

  const t = getEmailTranslations(locale)
  const fromUserName = getUserFullName(fromUser, locale)
  const toUserName = getUserFullName(toUser, locale)

  try {
    await sendEmail({
      to: toUser.email,
      subject: `${t.activity.referralCreatedSubject} - ${chapterName}`,
      siteId,
      html: generateEmailTemplate({
        title: t.activity.referralCreatedTitle,
        chapterName,
        locale,
        content: `
          <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
            ${t.greeting}, ${toUserName}!
          </p>
          <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
            <strong>${fromUserName}</strong> ${t.activity.referralRegistered}
          </p>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>${t.activity.referralDate}:</strong> ${formatDateForEmail(date, locale, timezone)}</p>
            <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>${t.activity.referralFrom}:</strong> ${fromUserName}</p>
            ${value ? `<p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>${t.activity.referralPotentialValue}:</strong> €${value.toLocaleString(locale === 'lv' ? 'lv-LV' : 'en-US')}</p>` : ''}
            <p style="margin: 0; color: #1f2937; font-size: 16px;"><strong>${t.activity.referralDescription}:</strong></p>
            <p style="margin: 5px 0 0 0; color: #4b5563; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${description}</p>
          </div>
          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
            ${t.activity.referralUpdateStatus}
          </p>
        `,
        buttonText: t.activity.viewReferrals,
        buttonUrl: `${baseUrl}/my-profile/activities`,
      }),
    })
  } catch (error) {
    console.error('Failed to send referral created notification:', error)
  }
}

/**
 * Notify fromUser about referral status update
 */
export async function notifyReferralStatusUpdated(
  data: ReferralStatusNotificationData,
): Promise<void> {
  // timezone is part of the interface for consistency but this email has no date fields
  const {
    fromUser,
    toUser,
    description,
    status,
    value,
    baseUrl,
    chapterName,
    locale = 'lv',
    siteId,
  } = data

  const t = getEmailTranslations(locale)
  const toUserName = getUserFullName(toUser, locale)
  const fromUserName = getUserFullName(fromUser, locale)
  const statusText = status === 'success' ? t.activity.referralSuccess : t.activity.referralFailed
  const statusColor = status === 'success' ? '#16a34a' : '#dc2626'

  try {
    await sendEmail({
      to: fromUser.email,
      subject: `${t.activity.referralStatusSubject} - ${chapterName}`,
      siteId,
      html: generateEmailTemplate({
        title: t.activity.referralStatusTitle,
        chapterName,
        locale,
        content: `
          <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
            ${t.greeting}, ${fromUserName}!
          </p>
          <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
            <strong>${toUserName}</strong> ${t.activity.referralStatusUpdated}
          </p>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;">
              <strong>${t.activity.referralStatus}:</strong>
              <span style="display: inline-block; padding: 4px 12px; background-color: ${statusColor}; color: white; border-radius: 4px; font-size: 14px;">${statusText}</span>
            </p>
            <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>${t.activity.referralRecipient}:</strong> ${toUserName}</p>
            ${status === 'success' && value ? `<p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>${t.activity.referralBusinessValue}:</strong> €${value.toLocaleString(locale === 'lv' ? 'lv-LV' : 'en-US')}</p>` : ''}
            <p style="margin: 0; color: #1f2937; font-size: 16px;"><strong>${t.activity.referralDescription}:</strong></p>
            <p style="margin: 5px 0 0 0; color: #4b5563; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${description}</p>
          </div>
          ${
            status === 'success'
              ? `
          <p style="margin: 0; color: #16a34a; font-size: 16px; line-height: 1.5; font-weight: 600;">
            ${t.activity.referralCongrats}
          </p>
          `
              : ''
          }
        `,
        buttonText: t.activity.viewReferrals,
        buttonUrl: `${baseUrl}/my-profile/activities`,
      }),
    })
  } catch (error) {
    console.error('Failed to send referral status notification:', error)
  }
}
