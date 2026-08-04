import { headers as getHeaders } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Mail, Phone, Globe, User as UserIcon, Award, Calendar, Building2 } from 'lucide-react'
import slugify from 'slugify'
import { Breadcrumb, CompanyLogo } from '@/components'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { getSettings } from '@/lib/getSiteSettings'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import type { Payload } from 'payload'
import type { SuccessStory, Member, User } from '@/payload-types'

// Helper: Fetch author membership data
async function fetchAuthorMembership(
  payload: Payload,
  authorId: string | number,
) {
  const result = await payload.find({
    collection: 'members',
    where: {
      user: { equals: authorId },
    },
    limit: 1,
    depth: 1,
  })
  return result.docs[0] || null
}

// Helper: Extract profile image from membership
function getProfileImage(membership: Member | null) {
  if (!membership?.profileImage) return null
  return typeof membership.profileImage === 'object' ? membership.profileImage : null
}

// Helper: Extract logo from membership
function getLogo(membership: Member | null) {
  if (!membership?.logo) return null
  return typeof membership.logo === 'object' ? membership.logo : null
}

// Helper: Validate and fetch success story
async function fetchSuccessStory(payload: Payload, id: string) {
  let story: SuccessStory
  try {
    story = await payload.findByID({
      collection: 'success-stories',
      id,
      depth: 2,
    })
  } catch {
    return null
  }

  if (!story || !story.isPublic) {
    return null
  }

  return story
}

// Helper: Extract user object from relationship
function extractUser(userOrId: string | number | User | null | undefined): User | null {
  if (!userOrId) return null
  return typeof userOrId === 'object' ? userOrId : null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })
  const settings = await getSettings()

  try {
    const story = await payload.findByID({
      collection: 'success-stories',
      id,
      depth: 1,
    })

    if (!story || !story.isPublic) {
      return { title: 'Success Story Not Found' }
    }

    const author = extractUser(story.author)

    // Get author's membership for company info
    let authorCompany = ''
    if (author) {
      const authorMembership = await fetchAuthorMembership(payload, author.id)
      authorCompany = authorMembership?.company || ''
    }

    return {
      title: `${story.title} - Success Stories`,
      description: `Success story by ${author?.name} ${author?.surname} from ${authorCompany}`,
    }
  } catch {
    return { title: 'Success Story Not Found' }
  }
}

export default async function SuccessStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })
  const isLoggedIn = user && isUserActive(user as UserWithContext)

  const settings = await getSettings()
  const locale = (settings?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  if (!settings) {
    notFound()
  }

  // Check if success stories feature is enabled
  if (settings.enableSuccessStories === false) {
    redirect('/')
  }

  const story = await fetchSuccessStory(payload, id)
  if (!story) {
    notFound()
  }

  const author = extractUser(story.author)
  if (!author) {
    notFound()
  }

  // Get author's membership for profile data
  const authorMembership = await fetchAuthorMembership(payload, author.id)
  const authorProfileImage = getProfileImage(authorMembership)
  const authorLogo = getLogo(authorMembership)

  // Get partner member's membership for profile data
  const partnerMember = extractUser(story.partnerMember)
  const partnerMembership = partnerMember
    ? await fetchAuthorMembership(payload, partnerMember.id)
    : null

  const formattedDate = new Date(story.createdAt).toLocaleDateString(
    locale === 'lv' ? 'lv-LV' : 'en-US',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    },
  )

  return (
    <div className="bg-neutral-50 dark:bg-surface min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb
          items={[
            { label: t('common', 'home'), href: '/' },
            { label: t('successStory', 'pageTitle'), href: '/success-stories' },
            { label: story.title },
          ]}
        />

        {/* Story Header */}
        <div className="bg-white dark:bg-surface-raised rounded-lg shadow-sm p-6 md:p-8 mb-6">
          <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
            <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </div>
            {story.businessValue && (
              <div className="flex items-center gap-1.5 bg-brand/10 dark:bg-brand/20 text-brand px-3 py-1 rounded-full font-medium">
                <Award className="h-4 w-4" />
                {story.businessValue}
              </div>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-ink dark:text-white mb-6">
            {story.title}
          </h1>

          {/* Story Content */}
          <div
            className="prose prose-lg dark:prose-invert prose-headings:font-bold prose-headings:text-ink dark:prose-headings:text-surface-text prose-h2:text-xl prose-h3:text-lg prose-a:text-brand prose-a:underline hover:prose-a:text-brand-dark prose-strong:font-bold prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-1 max-w-none"
            dangerouslySetInnerHTML={{ __html: story.story }}
          />

          {/* Partner Member */}
          {partnerMember && (
            <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                {t('successStory', 'partnerInDeal')}
              </p>
              <div className="flex items-center gap-3">
                {partnerMembership?.profileImage &&
                typeof partnerMembership.profileImage === 'object' &&
                partnerMembership.profileImage.url ? (
                  <Image
                    src={partnerMembership.profileImage.url}
                    alt={`${partnerMember.name} ${partnerMember.surname}`}
                    width={40}
                    height={40}
                    className="rounded-full object-cover w-10 h-10"
                  />
                ) : (
                  <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {partnerMember.name?.charAt(0)}
                    {partnerMember.surname?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium text-ink dark:text-surface-text">
                    {partnerMember.name} {partnerMember.surname}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {partnerMembership?.company}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Author Section */}
        <div className="bg-white dark:bg-surface-raised rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-ink dark:text-surface-text mb-4">
            {t('successStory', 'aboutAuthor')}
          </h2>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex items-start gap-4">
              {authorProfileImage?.url ? (
                <Image
                  src={authorProfileImage.url}
                  alt={`${author.name} ${author.surname}`}
                  width={80}
                  height={80}
                  className="rounded-full object-cover w-20 h-20 shrink-0"
                />
              ) : (
                <div className="w-20 h-20 bg-brand rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  {author.name?.charAt(0)}
                  {author.surname?.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <p className="text-lg font-semibold text-ink dark:text-surface-text">
                  {author.name} {author.surname}
                </p>
                {authorMembership?.jobPosition && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {authorMembership.jobPosition}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  <Building2 className="h-4 w-4" />
                  {authorMembership?.company}
                </div>

                <div className="flex flex-wrap gap-3 mt-3">
                  {authorMembership?.companyEmail && (
                    <a
                      href={`mailto:${authorMembership.companyEmail}`}
                      className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-brand"
                    >
                      <Mail className="h-4 w-4" />
                      {authorMembership.companyEmail}
                    </a>
                  )}
                  {authorMembership?.companyPhone && (
                    <a
                      href={`tel:${authorMembership.companyPhone}`}
                      className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-brand"
                    >
                      <Phone className="h-4 w-4" />
                      {authorMembership.companyPhone}
                    </a>
                  )}
                  {authorMembership?.website && (
                    <a
                      href={
                        authorMembership.website.startsWith('http')
                          ? authorMembership.website
                          : `https://${authorMembership.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-brand"
                    >
                      <Globe className="h-4 w-4" />
                      {authorMembership.website}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Logo + actions */}
            <div className="sm:ml-auto flex flex-col items-start sm:items-end gap-3">
              {authorLogo?.url && (
                <div className="bg-white dark:bg-neutral-700 rounded-lg p-2">
                  <CompanyLogo
                    src={authorLogo.url}
                    alt={authorMembership?.company || ''}
                    width={120}
                    height={48}
                  />
                </div>
              )}
              <div className="flex gap-2">
                {authorMembership?.company && (
                  <Link
                    href={`/companies/${slugify(authorMembership.company, { lower: true, strict: true })}`}
                    className="flex items-center gap-2 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:border-brand hover:text-brand text-sm"
                  >
                    <Building2 className="h-4 w-4" />
                    {t('successStory', 'company')}
                  </Link>
                )}
                {isLoggedIn && (
                  <Link
                    href={`/members/${slugify(author.name + '-' + author.surname, { lower: true, strict: true })}`}
                    className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 text-sm"
                  >
                    <UserIcon className="h-4 w-4" />
                    {t('successStory', 'viewProfile')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Back to all stories */}
        <div className="mt-6 text-center">
          <Link href="/success-stories" className="text-brand hover:underline font-medium">
            ← {t('successStory', 'viewAllStories')}
          </Link>
        </div>
      </div>
    </div>
  )
}
