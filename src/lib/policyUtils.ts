import type { Setting } from '@/payload-types'
import { DEFAULT_ORG_NAME } from './branding'

interface PolicyPlaceholders {
  siteName: string
  siteEmail: string
  siteDomain: string
  currentDate: string
  lastUpdated: string
}

/**
 * Replace placeholders in policy content with actual site values
 */
export function replacePolicyPlaceholders(
  content: string,
  placeholders: PolicyPlaceholders,
): string {
  return content
    .replace(/\{site-name\}/g, placeholders.siteName)
    .replace(/\{site-email\}/g, placeholders.siteEmail)
    .replace(/\{site-domain\}/g, placeholders.siteDomain)
    .replace(/\{current-date\}/g, placeholders.currentDate)
    .replace(/\{last-updated\}/g, placeholders.lastUpdated)
}

/**
 * Build placeholders object from site settings
 * Email is taken from SiteSettings.adminEmails (first entry) or emailFrom
 */
export function buildPlaceholders(
  siteSettings: Setting | null,
  lastUpdated: string | null | undefined,
  locale: 'lv' | 'en',
): PolicyPlaceholders {
  const dateLocale = locale === 'lv' ? 'lv-LV' : 'en-US'
  const today = new Date().toLocaleDateString(dateLocale)

  // Get email from settings: prefer first adminEmail, fallback to emailFrom
  const adminEmails = siteSettings?.adminEmails
  const firstAdminEmail = adminEmails?.[0]?.email
  const siteEmail = firstAdminEmail || siteSettings?.emailFrom || process.env.EMAIL_FROM || ''

  return {
    siteName: siteSettings?.siteName || DEFAULT_ORG_NAME,
    siteEmail,
    // The organisation's domain was a field on the tenant record; a single
    // install knows its own address from configuration instead.
    siteDomain: (process.env.NEXT_PUBLIC_SERVER_URL || '').replace(/^https?:\/\//, ''),
    currentDate: today,
    lastUpdated: lastUpdated ? new Date(lastUpdated).toLocaleDateString(dateLocale) : today,
  }
}
