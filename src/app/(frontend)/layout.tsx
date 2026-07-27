import React from 'react'
import { headers } from 'next/headers'
import { Figtree, IBM_Plex_Mono, Outfit } from 'next/font/google'
import './styles.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Analytics } from '@/components/Analytics'
import { ThemeProvider } from '@/components/ThemeProvider'
import { TranslationsProvider } from '@/components/TranslationsProvider'
import { SiteProvider } from '@/components/SiteProvider'
import type { Media } from '@/payload-types'
import { getMessages, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { getSettings } from '@/lib/getSiteSettings'
import { VersionCheck } from '@/components/VersionCheck'
import { DEFAULT_ORG_NAME } from '@/lib/branding'

/**
 * Every page here is database-backed and most are per-member, so none may be
 * frozen into the build.
 *
 * This used to be implicit: resolving the request's host to an organisation
 * read `headers()`, and that alone opted every route out of static generation.
 * Settings are read without touching headers now, so Next.js would happily
 * prerender these pages at build time and serve whatever the database held at
 * deploy — including, on pages that render a member's own data, nothing at all.
 * Saying it outright is what that side effect was doing by accident.
 */
export const dynamic = 'force-dynamic'

/**
 * Three type roles, self-hosted by `next/font` so nothing is fetched from a
 * third party at runtime.
 *
 * `latin-ext` is not optional: the interface ships in Latvian and Lithuanian,
 * and without it every ā/ē/ķ/ļ/ņ falls back to a system face mid-word.
 *
 * - display — headings and the figures in the stats band
 * - body    — everything read as prose or interface text
 * - data    — eyebrows, dates, times, counts; anything that wants to line up
 *             in a column. Loaded at three weights because it is not variable.
 */
const displayFont = Figtree({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-display-face',
})

const bodyFont = Outfit({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-body-face',
})

const dataFont = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-data-face',
})

/**
 * Fallback metadata only. Title and description come from `Settings` /
 * `ListingPagesSeo` and override this on every real page; what remains here is
 * what a fresh install serves before any content exists.
 */
export const metadata = {
  title: {
    default: DEFAULT_ORG_NAME,
    template: `%s | ${DEFAULT_ORG_NAME}`,
  },
  description: 'A member directory and referral network for professional organisations.',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  const settings = await getSettings()

  // Get site settings from collection (site-scoped)

  const favicon16 = settings?.favicon16 as Media | undefined
  const favicon32 = settings?.favicon32 as Media | undefined
  const appleTouchIcon = settings?.appleTouchIcon as Media | undefined
  const favicon192 = settings?.favicon192 as Media | undefined
  const favicon512 = settings?.favicon512 as Media | undefined

  const locale = (settings?.locale as Locale) || DEFAULT_LOCALE
  const messages = getMessages(locale)

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable} ${dataFont.variable}`}
    >
      <head>
        {favicon16 && typeof favicon16 !== 'string' && favicon16.url && (
          <link rel="icon" type="image/png" sizes="16x16" href={favicon16.url} />
        )}
        {favicon32 && typeof favicon32 !== 'string' && favicon32.url && (
          <link rel="icon" type="image/png" sizes="32x32" href={favicon32.url} />
        )}
        {appleTouchIcon && typeof appleTouchIcon !== 'string' && appleTouchIcon.url && (
          <link rel="apple-touch-icon" sizes="180x180" href={appleTouchIcon.url} />
        )}
        {favicon192 && typeof favicon192 !== 'string' && favicon192.url && (
          <link rel="icon" type="image/png" sizes="192x192" href={favicon192.url} />
        )}
        {favicon512 && typeof favicon512 !== 'string' && favicon512.url && (
          <link rel="icon" type="image/png" sizes="512x512" href={favicon512.url} />
        )}
        <Analytics
          googleAnalyticsId={settings?.googleAnalyticsId || undefined}
          googleTagManagerId={settings?.googleTagManagerId || undefined}
          facebookPixelId={settings?.facebookPixelId || undefined}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-paper text-ink dark:bg-surface dark:text-surface-text transition-colors antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'system';
                  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark);
                  
                  console.log('[Theme Init]', { theme, systemPrefersDark, isDark });
                  
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  console.error('[Theme Init Error]', e);
                }
              })();
            `,
          }}
        />
        <VersionCheck />
        <ThemeProvider>
          <TranslationsProvider messages={messages}>
            <SiteProvider
              siteId={settings?.id ? String(settings.id) : null}
              siteName={settings?.siteName || DEFAULT_ORG_NAME}
            >
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </SiteProvider>
          </TranslationsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
