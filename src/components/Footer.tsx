import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Instagram, Twitter, Linkedin } from 'lucide-react'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { getSettings } from '@/lib/getSiteSettings'
import { DEFAULT_ORG_NAME } from '@/lib/branding'

const SOCIAL_ICONS = {
  facebook: { Icon: Facebook, label: 'Facebook' },
  instagram: { Icon: Instagram, label: 'Instagram' },
  twitter: { Icon: Twitter, label: 'Twitter' },
  linkedin: { Icon: Linkedin, label: 'LinkedIn' },
} as const

export async function Footer() {
  const [siteSettings, currentSite] = await Promise.all([getSettings(), getSettings()])

  const siteName = siteSettings?.siteName || DEFAULT_ORG_NAME
  const logoUrl = typeof siteSettings?.siteLogo === 'object' ? siteSettings?.siteLogo?.url : null
  const socialMedia = siteSettings?.socialMedia
  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  const socialLinks = (
    Object.keys(SOCIAL_ICONS) as (keyof typeof SOCIAL_ICONS)[]
  ).flatMap((key) => {
    const href = socialMedia?.[key]
    return href ? [{ key, href, ...SOCIAL_ICONS[key] }] : []
  })

  const quickLinks = [
    { href: '/about', label: t('footer', 'aboutUs') },
    { href: '/events', label: t('footer', 'events') },
    { href: '/contacts', label: t('footer', 'contact') },
  ]

  const legalLinks = [
    { href: '/terms-and-conditions', label: t('footer', 'termsOfUse') },
    { href: '/privacy-policy', label: t('footer', 'privacyPolicy') },
    { href: '/cookie-policy', label: t('footer', 'cookiePolicy') },
  ]

  const linkClass =
    'text-sm text-ink-soft transition-colors hover:text-brand dark:text-neutral-400 dark:hover:text-surface-text'

  return (
    <footer className="border-t border-line bg-paper dark:border-line-dark dark:bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr]">
          <div className="max-w-sm">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={siteName}
                width={120}
                height={120}
                className="mb-5 object-contain dark:invert dark:brightness-0 dark:contrast-200"
              />
            ) : (
              <h3 className="mb-5 font-display text-xl font-semibold tracking-tight">{siteName}</h3>
            )}
            <p className="text-sm leading-relaxed text-ink-soft dark:text-neutral-400">
              {t('footer', 'description')}
            </p>
            {socialLinks.length > 0 && (
              <div className="mt-6 flex gap-2">
                {socialLinks.map(({ key, href, Icon, label }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors hover:border-brand hover:text-brand dark:border-line-dark dark:text-neutral-400"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="eyebrow mb-5">{t('footer', 'quickLinks')}</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="eyebrow mb-5">{t('footer', 'legal')}</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-line pt-6 text-xs text-ink-soft dark:border-line-dark dark:text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono">
            &copy; {new Date().getFullYear()} {siteName}. {t('common', 'allRightsReserved')}
          </p>
          <p>
            {t('footer', 'developedBy')}{' '}
            <a
              href="https://codars.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4 transition-colors hover:text-brand"
            >
              Codars Design
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
