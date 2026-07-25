import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import ContactsClient from './ContactsClient'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { headers } from 'next/headers'
import { generateMetadata as generateSeoMetadata } from '@/lib/seoHelpers'

export async function generateMetadata() {
  const headersList = await headers()
  const host = headersList.get('host')
  const currentSite = await getSettings()

  if (!currentSite) {
    return { title: 'Contact Us' }
  }

  const payload = await getPayload({ config })

  const [pageData, siteSettingsData] = await Promise.all([
    payload.find({
      collection: 'contacts-page-settings',
      where: {},
      limit: 1,
    }),
    payload.find({
      collection: 'settings',
      where: {},
      limit: 1,
      depth: 1,
    }),
  ])

  const page = pageData.docs[0] as any
  const siteSettings = siteSettingsData.docs[0] as any
  const baseUrl = `https://${host}`

  return generateSeoMetadata({
    seo: page?.seo,
    contentTitle: page?.title || 'Contact Us',
    siteSettings: siteSettings,
    siteBranding: siteSettings?.branding,
    baseUrl,
    pathname: '/contacts',
  })
}

export default async function ContactsPage() {
  const payload = await getPayload({ config })
  const currentSite = await getSettings()

  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  const pageDataResult = await payload.find({
    collection: 'contacts-page-settings',
    where: {},
    limit: 1,
    depth: 2,
  })

  const pageData = pageDataResult.docs[0] || {
    title: t('contacts', 'title'),
    contactPersons: [],
    formSettings: {
      formTitle: 'RAKSTI MUMS',
      formDescription: t('contacts', 'formDescription'),
      submitButtonText: t('common', 'submit'),
      successMessage: t('contacts', 'successMessage'),
    },
  }

  const pageTitle = pageData.title || t('contacts', 'title')

  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          <Link href="/" className="hover:text-brand transition-colors">
            {t('common', 'home')}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-ink dark:text-surface-text font-medium">{pageTitle}</span>
        </nav>

        <ContactsClient
          pageData={pageData}
          labels={{
            name: t('contacts', 'name'),
            email: t('contacts', 'email'),
            phone: t('contacts', 'phone'),
            subject: t('contacts', 'subject'),
            message: t('contacts', 'message'),
            sending: t('common', 'sending'),
            sendMessage: t('contacts', 'sendMessage'),
            formFillError: t('contacts', 'formNote'),
            sendError: t('contacts', 'errorMessage'),
          }}
        />
      </div>
    </div>
  )
}
