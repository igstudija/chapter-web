import { getPayload } from 'payload'
import config from '@/payload.config'
import Image from 'next/image'
import Link from 'next/link'
import { Mail, Phone } from 'lucide-react'
import { PageHeader } from '@/components'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { headers } from 'next/headers'
import { generateMetadata as generateSeoMetadata } from '@/lib/seoHelpers'

export async function generateMetadata() {
  const headersList = await headers()
  const host = headersList.get('host')
  const currentSite = await getSettings()

  if (!currentSite) {
    return { title: 'About Us' }
  }

  const payload = await getPayload({ config })

  const [pageData, siteSettingsData] = await Promise.all([
    payload.find({
      collection: 'about-us-settings',
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
    contentTitle: page?.title,
    siteSettings: siteSettings,
    siteBranding: siteSettings?.branding,
    baseUrl,
    pathname: '/about',
  })
}

export default async function AboutPage() {
  const payload = await getPayload({ config })
  const currentSite = await getSettings()

  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  const pageData = await payload.find({
    collection: 'about-us-settings',
    where: {},
    limit: 1,
    depth: 2,
  })

  const page = pageData.docs[0]

  if (!page) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl text-neutral-500">About Us page not configured</h1>
      </div>
    )
  }

  const pageTitle = page.title || t('nav', 'about')

  return (
    <div className="min-h-screen bg-paper dark:bg-surface">
      <PageHeader
        title={pageTitle}
        breadcrumbs={[{ label: t('common', 'home'), href: '/' }, { label: pageTitle }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">

        {page.introduction && (
          <div
            className="prose prose-lg dark:prose-invert prose-headings:font-bold prose-headings:text-ink dark:prose-headings:text-surface-text prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-a:text-brand prose-a:underline hover:prose-a:text-brand-dark prose-strong:font-bold prose-strong:text-ink dark:prose-strong:text-surface-text prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-1 prose-p:text-neutral-700 dark:prose-p:text-neutral-300 max-w-4xl mx-auto mb-16"
            dangerouslySetInnerHTML={{ __html: page.introduction }}
          />
        )}

        {page.chapterLeaders && page.chapterLeaders.length > 0 && (
          <section className="mb-16">
            <h2 className="display-2 mb-10 text-ink dark:text-surface-text">
              Chapter Leadership Team
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {page.chapterLeaders.map((leader: any, index: number) => {
                const member = typeof leader.member === 'object' ? leader.member : null
                const profileImage =
                  member?.profileImage && typeof member.profileImage === 'object'
                    ? member.profileImage
                    : null

                if (!member) return null

                return (
                  <div
                    key={index}
                    className="panel p-6 flex flex-col"
                  >
                    {profileImage?.url && (
                      <div className="mb-4">
                        <Image
                          src={profileImage.url}
                          alt={`${member.name} ${member.surname}`}
                          width={200}
                          height={200}
                          className="w-32 h-32 rounded-full mx-auto object-cover"
                        />
                      </div>
                    )}
                    <h3 className="text-xl font-semibold text-ink dark:text-surface-text text-center">
                      {member.name} {member.surname}
                    </h3>
                    <p className="text-brand text-center font-medium mb-3">{leader.position}</p>
                    {member.company && (
                      <p className="text-neutral-600 dark:text-neutral-300 text-sm text-center mb-4">
                        {member.company}
                      </p>
                    )}
                    <div className="space-y-2 text-sm">
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300 hover:text-brand"
                        >
                          <Mail className="h-4 w-4" />
                          {member.email}
                        </a>
                      )}
                      {member.phone && (
                        <a
                          href={`tel:${member.phone}`}
                          className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300 hover:text-brand"
                        >
                          <Phone className="h-4 w-4" />
                          {member.phone}
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {page.howWeWork && (
          <section className="mb-16 panel p-8">
            <h2 className="display-2 mb-6 text-ink dark:text-surface-text">
              {page.howWeWork.title || 'How We Work'}
            </h2>
            {page.howWeWork.description && (
              <div
                className="prose dark:prose-invert prose-headings:font-bold prose-headings:text-ink dark:prose-headings:text-surface-text prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-a:text-brand prose-a:underline hover:prose-a:text-brand-dark prose-strong:font-bold prose-strong:text-ink dark:prose-strong:text-surface-text prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-1 prose-p:text-neutral-700 dark:prose-p:text-neutral-300 max-w-none mb-8"
                dangerouslySetInnerHTML={{ __html: page.howWeWork.description }}
              />
            )}
            {page.howWeWork.meetings && page.howWeWork.meetings.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-ink dark:text-surface-text mb-4">
                  Meeting Schedule
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {page.howWeWork.meetings.map((meeting: any, index: number) => (
                    <div key={index} className="panel p-6">
                      <div className="space-y-2 text-neutral-700 dark:text-neutral-300">
                        {meeting.frequency && (
                          <p>
                            <strong>Frequency:</strong> {meeting.frequency}
                          </p>
                        )}
                        {meeting.time && (
                          <p>
                            <strong>Time:</strong> {meeting.time}
                          </p>
                        )}
                        {meeting.location && (
                          <p>
                            <strong>Location:</strong>
                            <br />
                            {meeting.location}
                          </p>
                        )}
                        {meeting.isVirtual && (
                          <p className="text-brand font-medium">✓ Virtual meetings available</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {page.principles && page.principles.length > 0 && (
          <section className="mb-16">
            <h2 className="display-2 mb-10 text-ink dark:text-surface-text">
              {t('about', 'principlesTitle')}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {page.principles.map((principle: any, index: number) => (
                <div
                  key={index}
                  className="panel border-l-2 border-l-brand p-6"
                >
                  <h3 className="text-xl font-semibold text-ink dark:text-surface-text mb-2">
                    {principle.title}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-300">{principle.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {page.membershipInfo && (
          <section className="relative overflow-hidden rounded-xl bg-neutral-900 p-10 text-center text-white dark:bg-neutral-950">
            <h2 className="display-2 mb-4">
              {page.membershipInfo.title || 'Join Our Chapter'}
            </h2>
            {page.membershipInfo.description && (
              <div
                className="prose prose-invert prose-headings:font-bold prose-headings:text-white prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-a:text-white prose-a:underline hover:prose-a:text-neutral-200 prose-strong:font-bold prose-strong:text-white prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-1 max-w-2xl mx-auto mb-6"
                dangerouslySetInnerHTML={{ __html: page.membershipInfo.description }}
              />
            )}
            {page.membershipInfo.benefits && page.membershipInfo.benefits.length > 0 && (
              <div className="max-w-2xl mx-auto">
                <h3 className="text-xl font-semibold mb-4">Membership Benefits</h3>
                <ul className="text-left space-y-2">
                  {page.membershipInfo.benefits.map((item: any, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-white">✓</span>
                      <span>{item.benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
