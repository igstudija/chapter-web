import { headers as getHeaders } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Mail, Phone, Globe, User } from 'lucide-react'
import slugify from 'slugify'
import { CompanyLogo, GalleryLightbox } from '@/components'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { getSettings } from '@/lib/getSiteSettings'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import type { Member, User as PayloadUser } from '@/payload-types'

function generateCompanySlug(company: string): string {
  return slugify(company, { lower: true, strict: true })
}

// Helper type for membership with populated user
type MembershipWithUser = Member & {
  user: PayloadUser
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const settings = await getSettings()

  if (!settings) {
    return { title: 'Company Not Found' }
  }

  const membershipsData = await payload.find({
    collection: 'members',
    where: {
      status: { equals: 'active' },
    },
    limit: 100,
    depth: 1,
  })

  const membership = membershipsData.docs.find(
    (m) => m.company && generateCompanySlug(m.company) === slug,
  )

  if (!membership) {
    return { title: 'Company Not Found' }
  }

  return {
    title: membership.company,
    description: membership.companyDescription || `Learn more about ${membership.company}`,
  }
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })
  const isLoggedIn = user && isUserActive(user as UserWithContext)

  const settings = await getSettings()
  if (!settings) {
    notFound()
  }

  const locale = (settings?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  // Fetch memberships for current site
  const membershipsData = await payload.find({
    collection: 'members',
    where: {
      status: { equals: 'active' },
    },
    limit: 100,
    depth: 2, // To get user and powerGroup data
  })

  const membership = membershipsData.docs.find(
    (m) => m.company && generateCompanySlug(m.company) === slug,
  ) as MembershipWithUser | undefined

  if (!membership) {
    notFound()
  }

  const memberUser = typeof membership.user === 'object' ? membership.user : null
  const memberLogo = membership.logo && typeof membership.logo === 'object' ? membership.logo : null
  const memberProfileImage =
    membership.profileImage && typeof membership.profileImage === 'object'
      ? membership.profileImage
      : null
  const powerGroup =
    membership.powerGroup && typeof membership.powerGroup === 'object'
      ? membership.powerGroup
      : null

  return (
    <div className="min-h-screen bg-paper dark:bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-10">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs">
            <li className="flex items-center gap-2">
              <Link href="/" className="text-ink-soft transition-colors hover:text-brand dark:text-neutral-400">
                {t('common', 'home')}
              </Link>
              <span aria-hidden="true" className="text-neutral-400 dark:text-neutral-600">/</span>
            </li>
            <li className="flex items-center gap-2">
              <Link
                href="/companies"
                className="text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
              >
                {t('companies', 'title')}
              </Link>
              <span aria-hidden="true" className="text-neutral-400 dark:text-neutral-600">/</span>
            </li>
            <li aria-current="page" className="text-ink dark:text-surface-text">
              {membership.company}
            </li>
          </ol>
        </nav>

        {/* Company Header */}
        <div className="panel mb-6 p-6 md:p-8">
          <div className="flex flex-col items-start gap-6 md:flex-row md:gap-8">
            {memberLogo?.url ? (
              <div className="shrink-0 rounded-lg bg-white p-4 ring-1 ring-line">
                <CompanyLogo
                  src={memberLogo.url}
                  alt={membership.company || ''}
                  width={200}
                  height={96}
                />
              </div>
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-line font-display text-3xl font-semibold text-brand dark:border-line-dark">
                {membership.company?.charAt(0)}
              </div>
            )}

            <div className="flex-1">
              <h1 className="display-2 text-ink dark:text-surface-text">{membership.company}</h1>

              <div className="mt-3 flex flex-wrap gap-2">
                {powerGroup && (
                  <span className="eyebrow rounded-full border border-brand/35 px-2.5 py-1 text-brand">
                    {powerGroup.title}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 mt-4 text-sm text-neutral-600 dark:text-neutral-300">
                {membership.companyEmail && (
                  <a
                    href={`mailto:${membership.companyEmail}`}
                    className="flex items-center gap-1 hover:text-brand"
                  >
                    <Mail className="h-4 w-4" />
                    {membership.companyEmail}
                  </a>
                )}
                {membership.companyPhone && (
                  <a
                    href={`tel:${membership.companyPhone}`}
                    className="flex items-center gap-1 hover:text-brand"
                  >
                    <Phone className="h-4 w-4" />
                    {membership.companyPhone}
                  </a>
                )}
                {membership.website && (
                  <a
                    href={`https://${membership.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-brand"
                  >
                    <Globe className="h-4 w-4" />
                    {membership.website}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Company Description */}
        {membership.companyDescription && (
          <div className="panel p-6 mb-6">
            <h2 className="eyebrow mb-5">
              {t('companies', 'aboutCompany')}
            </h2>
            <div
              className="prose prose-sm dark:prose-invert prose-headings:font-bold prose-headings:text-ink dark:prose-headings:text-surface-text prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-a:text-brand prose-a:underline hover:prose-a:text-brand-dark prose-strong:font-bold prose-strong:text-ink dark:prose-strong:text-surface-text prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-1 max-w-none break-word overflow-hidden"
              dangerouslySetInnerHTML={{ __html: membership.companyDescription }}
            />
          </div>
        )}

        {/* Gallery */}
        {membership.gallery && membership.gallery.length > 0 && (
          <div className="panel p-6 mb-6">
            <h2 className="eyebrow mb-5">
              {t('companies', 'gallery')}
            </h2>
            <GalleryLightbox
              gallery={membership.gallery
                .filter((item) => typeof item.image === 'object' && item.image?.url)
                .map((item) => ({
                  id: item.id,
                  image:
                    typeof item.image === 'object'
                      ? { id: String(item.image.id), url: item.image.url }
                      : '',
                  caption: item.caption,
                }))}
            />
          </div>
        )}

        {/* Representative */}
        {memberUser && (
          <div className="panel p-6">
            <h2 className="eyebrow mb-5">
              {t('companies', 'representative')}
            </h2>
            <div className="flex items-center gap-4">
              {memberProfileImage?.url ? (
                <Image
                  src={memberProfileImage.url}
                  alt={`${memberUser.name} ${memberUser.surname}`}
                  width={64}
                  height={64}
                  className="rounded-full object-cover w-16 h-16"
                />
              ) : (
                <div className="w-16 h-16 bg-brand rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {memberUser.name?.charAt(0)}
                  {memberUser.surname?.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-ink dark:text-surface-text">
                  {memberUser.name} {memberUser.surname}
                </p>
                {membership.jobPosition && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {membership.jobPosition}
                  </p>
                )}
                {isLoggedIn && membership.phone && (
                  <a
                    href={`tel:${membership.phone}`}
                    className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-brand flex items-center gap-1 mt-1"
                  >
                    <Phone className="h-3 w-3" />
                    {membership.phone}
                  </a>
                )}
                {isLoggedIn && memberUser.email && (
                  <a
                    href={`mailto:${memberUser.email}`}
                    className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-brand flex items-center gap-1 mt-1"
                  >
                    <Mail className="h-3 w-3" />
                    {memberUser.email}
                  </a>
                )}
              </div>
              {isLoggedIn && (
                <Link
                  href={
                    '/members/' +
                    slugify(memberUser.name + '-' + memberUser.surname, {
                      lower: true,
                      strict: true,
                    })
                  }
                  className="ml-auto flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 text-sm"
                >
                  <User className="h-4 w-4" />
                  {t('members', 'viewProfile')}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
