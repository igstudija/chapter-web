import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import ContactsClient, { type ContactPerson } from './ContactsClient'
import { encodeEmail } from '@/lib/emailObfuscation'
import { PageHeader } from '@/components'
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
    siteBranding: siteSettings,
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

  /*
   * Only what the cards print crosses to the client. This page used to hand
   * ContactsClient the whole depth-2 document, so every contact person's
   * member *and* user record — role, sessions, and the magic-link token — was
   * serialised into the public HTML. Whatever a client component receives is
   * published; build the props from a whitelist.
   */
  const meaningful = (value: unknown): string => {
    const text = typeof value === 'string' ? value.trim() : ''
    // A lone "-" typed into an optional field is "nothing", not a job title.
    return /[\p{L}\p{N}]/u.test(text) ? text : ''
  }
  const contactPersons = ((pageData as any).contactPersons ?? [])
    .map((item: any) => {
      const member = item?.member
      if (!member || typeof member !== 'object') return null
      const user = member.user && typeof member.user === 'object' ? member.user : null
      const image =
        member.profileImage && typeof member.profileImage === 'object' ? member.profileImage : null
      return {
        id: String(member.id),
        name: meaningful(user?.name || member.name),
        surname: meaningful(user?.surname || member.surname),
        emailEncoded: encodeEmail(member.email || user?.email || ''),
        phone: meaningful(member.phone),
        orgRole: meaningful(member.orgRole),
        jobPosition: meaningful(member.jobPosition),
        company: meaningful(member.company),
        profileImageUrl: image?.url || null,
      }
    })
    .filter(Boolean) as ContactPerson[]
  const formSettings = (pageData as any).formSettings ?? null

  return (
    <div className="min-h-screen bg-paper dark:bg-surface">
      <PageHeader
        title={pageTitle}
        breadcrumbs={[{ label: t('common', 'home'), href: '/' }, { label: pageTitle }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <ContactsClient
          contactPersons={contactPersons}
          formSettings={formSettings}
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
