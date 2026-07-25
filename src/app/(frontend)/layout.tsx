import React, { Suspense } from 'react'
import { headers } from 'next/headers'
import './styles.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Analytics } from '@/components/Analytics'
import { ThemeProvider } from '@/components/ThemeProvider'
import { TranslationsProvider } from '@/components/TranslationsProvider'
import { SiteProvider } from '@/components/SiteProvider'
import type { Media } from '@/payload-types'
import { getMessages, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { getSiteFromHost, isSuperadminHost } from '@/lib/getSiteFromHost'
import { getSiteSettings } from '@/lib/getSiteSettings'
import { ChatBotWrapper } from '@/components/ChatBotWrapper'
import { VersionCheck } from '@/components/VersionCheck'
import { DEFAULT_ORG_NAME } from '@/lib/branding'

/**
 * Fallback metadata only. Per-organisation title and description come from
 * `SiteSettings` / `ListingPagesSeo` and override this on every real page; what
 * remains here is what a fresh install serves before any content exists.
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

  // Get current site from hostname
  const headersList = await headers()
  const host = headersList.get('host')
  const currentSite = await getSiteFromHost(host)

  // Get site settings from collection (site-scoped)
  const siteSettings = await getSiteSettings()

  const favicon16 = siteSettings?.favicon16 as Media | undefined
  const favicon32 = siteSettings?.favicon32 as Media | undefined
  const appleTouchIcon = siteSettings?.appleTouchIcon as Media | undefined
  const favicon192 = siteSettings?.favicon192 as Media | undefined
  const favicon512 = siteSettings?.favicon512 as Media | undefined

  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const messages = getMessages(locale)

  return (
    <html lang={locale} suppressHydrationWarning>
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
          googleAnalyticsId={siteSettings?.googleAnalyticsId || undefined}
          googleTagManagerId={siteSettings?.googleTagManagerId || undefined}
          facebookPixelId={siteSettings?.facebookPixelId || undefined}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-neutral-50 dark:bg-surface dark:text-surface-text transition-colors">
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
              siteId={currentSite?.id ? String(currentSite.id) : null}
              siteName={siteSettings?.siteName || currentSite?.name || DEFAULT_ORG_NAME}
              siteSlug={currentSite?.slug || null}
            >
              {host && isSuperadminHost(host) ? (
                // Superadmin panel - no header/footer
                <main className="flex-1">{children}</main>
              ) : (
                // Chapter sites - full layout
                <>
                  <Header />
                  <main className="flex-1">{children}</main>
                  <Footer />
                  <Suspense fallback={null}>
                    <ChatBotWrapper />
                  </Suspense>
                </>
              )}
            </SiteProvider>
          </TranslationsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
