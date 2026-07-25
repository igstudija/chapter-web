import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { HeaderClient } from './HeaderClient'
import type { Media } from '@/payload-types'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { getSiteFromHost } from '@/lib/getSiteFromHost'
import { getSiteSettings } from '@/lib/getSiteSettings'
import { isUserAdmin, type UserWithContext } from '@/lib/userHelpers'
import { DEFAULT_ORG_NAME } from '@/lib/branding'

export async function Header() {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  // Get current site from hostname
  const headersList = await headers()
  const host = headersList.get('host')
  const currentSite = await getSiteFromHost(host)

  const payload = await getPayload({ config })

  let user = null
  if (token) {
    try {
      const { user: authUser } = await payload.auth({
        headers: new Headers({ Authorization: `JWT ${token}` }),
      })
      user = authUser
    } catch {
      user = null
    }
  }

  // Get site settings from collection (site-scoped)
  const siteSettings = await getSiteSettings()

  // Use site-specific values from settings collection
  const siteName = siteSettings?.siteName || currentSite?.name || DEFAULT_ORG_NAME
  const siteLogo = siteSettings?.siteLogo as Media | undefined
  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  // Check if success stories feature is enabled (default to true)
  const enableSuccessStories = currentSite?.enableSuccessStories !== false

  const publicNavigation = [
    { name: t('nav', 'blog'), href: '/blog' },
    { name: t('nav', 'companies'), href: '/companies' },
    { name: t('nav', 'events'), href: '/events' },
    ...(enableSuccessStories ? [{ name: t('nav', 'successStories'), href: '/success-stories' }] : []),
    { name: t('nav', 'faq'), href: '/faq' },
    { name: t('nav', 'contacts'), href: '/contacts' },
  ]

  const memberNavigation = [
    { name: t('nav', 'blog'), href: '/blog' },
    { name: t('nav', 'companies'), href: '/companies' },
    { name: t('nav', 'events'), href: '/events' },
    ...(enableSuccessStories ? [{ name: t('nav', 'successStories'), href: '/success-stories' }] : []),
    { name: t('nav', 'wiki'), href: '/wiki' },
    { name: t('nav', 'specialRequests'), href: '/members/special-requests' },
    { name: t('nav', 'faq'), href: '/faq' },
    { name: t('nav', 'contacts'), href: '/contacts' },
    { name: t('nav', 'members'), href: '/members' },
    { name: t('nav', 'top4020'), href: '/members/top-40-20' },
  ]

  const navigation = user ? memberNavigation : publicNavigation

  // Determine if user should see admin link
  const userWithContext = user as UserWithContext | null
  const showAdminLink = isUserAdmin(userWithContext)

  return (
    <HeaderClient
      siteName={siteName}
      siteLogoUrl={siteLogo && typeof siteLogo !== 'string' ? siteLogo.url || undefined : undefined}
      navigation={navigation}
      user={user ? { isAdmin: showAdminLink } : null}
    />
  )
}
