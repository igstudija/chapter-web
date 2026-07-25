import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Instagram, Twitter, Linkedin } from 'lucide-react'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { getSiteSettings, getCurrentSite } from '@/lib/getSiteSettings'
import { DEFAULT_ORG_NAME } from '@/lib/branding'

export async function Footer() {
  const [siteSettings, currentSite] = await Promise.all([getSiteSettings(), getCurrentSite()])

  const siteName = siteSettings?.siteName || DEFAULT_ORG_NAME
  const logoUrl = typeof siteSettings?.siteLogo === 'object' ? siteSettings?.siteLogo?.url : null
  const socialMedia = siteSettings?.socialMedia
  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  return (
    <footer className="bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            {logoUrl ? (
              <div className="mb-4">
                <Image
                  src={logoUrl}
                  alt={siteName}
                  width={120}
                  height={120}
                  className="object-contain dark:invert dark:brightness-0 dark:contrast-200"
                />
              </div>
            ) : (
              <h3 className="text-xl font-bold mb-4">{siteName}</h3>
            )}
            <p className="text-neutral-600 dark:text-neutral-300">{t('footer', 'description')}</p>
            {socialMedia && (
              <div className="flex gap-4 mt-4">
                {socialMedia.facebook && (
                  <a
                    href={socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {socialMedia.instagram && (
                  <a
                    href={socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {socialMedia.twitter && (
                  <a
                    href={socialMedia.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    aria-label="Twitter"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
                {socialMedia.linkedin && (
                  <a
                    href={socialMedia.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t('footer', 'quickLinks')}</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {t('footer', 'aboutUs')}
                </Link>
              </li>
              <li>
                <Link
                  href="/events"
                  className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {t('footer', 'events')}
                </Link>
              </li>
              <li>
                <Link
                  href="/contacts"
                  className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {t('footer', 'contact')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t('footer', 'legal')}</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/terms-and-conditions"
                  className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {t('footer', 'termsOfUse')}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {t('footer', 'privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link
                  href="/cookie-policy"
                  className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {t('footer', 'cookiePolicy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 text-center text-neutral-500 dark:text-neutral-400">
          <p>
            &copy; {new Date().getFullYear()} {siteName}. {t('common', 'allRightsReserved')}
          </p>
          <p className="mt-2 text-sm">
            {t('footer', 'developedBy')}{' '}
            <a
              href="https://codars.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-neutral-900 dark:hover:text-white transition-colors underline underline-offset-2"
            >
              Codars Design
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
