import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { SuccessStoryBlogCard } from '@/components/SuccessStoryBlogCard'
import { Breadcrumb } from '@/components'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { getSettings } from '@/lib/getSiteSettings'
import { headers } from 'next/headers'
import { generateMetadata as generateSeoMetadata } from '@/lib/seoHelpers'

export async function generateMetadata() {
  const headersList = await headers()
  const host = headersList.get('host')
  const currentSite = await getSettings()
  const siteId = currentSite?.id

  if (!currentSite) {
    return { title: 'Success Stories' }
  }

  const payload = await getPayload({ config })

  const [listingSeoData, siteSettingsData] = await Promise.all([
    payload.find({
      collection: 'listing-pages-seo',
      where: { site: { equals: siteId } },
      limit: 1,
      depth: 1,
    }),
    payload.find({
      collection: 'settings',
      where: { site: { equals: siteId } },
      limit: 1,
      depth: 1,
    }),
  ])

  const listingSeo = listingSeoData.docs[0] as any
  const siteSettings = siteSettingsData.docs[0] as any
  const baseUrl = `https://${host}`

  return generateSeoMetadata({
    seo: listingSeo?.successStoriesPage?.seo,
    contentTitle: listingSeo?.successStoriesPage?.pageTitle || 'Success Stories',
    contentDescription: listingSeo?.successStoriesPage?.pageDescription || 'Read success stories from our members.',
    siteSettings: siteSettings,
    siteBranding: siteSettings?.branding,
    baseUrl,
    pathname: '/success-stories',
  })
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').substring(0, 150) + '...'
}

export default async function SuccessStoriesPage() {
  const payload = await getPayload({ config })

  const currentSite = await getSettings()

  // Check if success stories feature is enabled
  if (currentSite?.enableSuccessStories === false) {
    redirect('/')
  }

  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  // Get success stories and memberships in parallel
  const [successStoriesData, membershipsData] = await Promise.all([
    currentSite ? payload.find({
      collection: 'success-stories',
      where: {
        and: [
          { isPublic: { equals: true } },
        ],
      },
      limit: 50,
      sort: '-createdAt',
      depth: 1,
    }) : Promise.resolve({ docs: [], totalDocs: 0 }),
    currentSite ? payload.find({
      collection: 'members',
      where: {
        status: { equals: 'active' },
      },
      limit: 500,
      depth: 1,
    }) : Promise.resolve({ docs: [] }),
  ])

  // Create a map of user ID to membership for quick lookup
  const membershipByUserId = new Map<string, typeof membershipsData.docs[0]>()
  for (const membership of membershipsData.docs) {
    const userId = typeof membership.user === 'object' ? membership.user?.id : membership.user
    if (userId) {
      membershipByUserId.set(String(userId), membership)
    }
  }

  return (
    <div className="bg-neutral-50 dark:bg-surface min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: t('common', 'home'), href: '/' }, { label: t('successStory', 'pageTitle') }]} />

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-ink dark:text-white mb-4">
            {t('successStory', 'pageTitle')}
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
            {t('successStory', 'pageDescription')}
          </p>
        </div>

        {successStoriesData.docs.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {successStoriesData.docs.map((story) => {
              const author =
                story.author && typeof story.author === 'object' ? story.author : null
              if (!author) return null

              const authorId = String(author.id)
              const authorMembership = membershipByUserId.get(authorId)

              const profileImage =
                authorMembership?.profileImage && typeof authorMembership.profileImage === 'object'
                  ? authorMembership.profileImage
                  : null
              const logo =
                authorMembership?.logo && typeof authorMembership.logo === 'object' ? authorMembership.logo : null

              return (
                <SuccessStoryBlogCard
                  key={String(story.id)}
                  id={String(story.id)}
                  title={story.title}
                  excerpt={stripHtml(story.story)}
                  businessValue={story.businessValue}
                  createdAt={story.createdAt}
                  author={{
                    name: author.name,
                    surname: author.surname,
                    company: authorMembership?.company || '',
                    profileImageUrl: profileImage?.url || null,
                    logoUrl: logo?.url || null,
                  }}
                />
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-neutral-500 dark:text-neutral-400 text-lg">
              {t('successStory', 'noStories')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
