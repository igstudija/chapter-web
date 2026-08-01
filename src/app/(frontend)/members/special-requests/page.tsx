import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { PageHeader } from '@/components'
import { SpecialRequestsGrid } from '@/components/SpecialRequestsGrid'
import { readAllPartners } from '@/lib/chapterExchange/readPartners'
import { partnerRowsForList } from '@/lib/chapterExchange/mergeIntoList'

export const metadata = {
  title: 'Special Requests',
  description: 'View and submit special requests.',
}

export default async function SpecialRequestsPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    redirect('/login')
  }

  const settings = await getSettings()
  if (!settings) {
    redirect('/login')
  }

  const locale = (settings?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  // Fetch requests, memberships and the chapters we are linked to in parallel.
  const [requestsData, membershipsData, connectionsData] = await Promise.all([
    payload.find({
      collection: 'special-requests',
      where: {},
      limit: 1000,
      sort: '-createdAt',
      depth: 2,
    }),
    payload.find({
      collection: 'members',
      where: {
        status: { equals: 'active' },
      },
      limit: 500,
      depth: 2,
    }),
    payload.find({ collection: 'chapter-connections', limit: 1000, depth: 0, overrideAccess: true }),
  ])

  // Linked chapters are read live. One that does not answer contributes
  // nothing and is not mentioned — the list is simply shorter (ADR 0007).
  const partners = await readAllPartners({
    connections: connectionsData.docs,
    onReached: (id) => {
      void payload.update({
        collection: 'chapter-connections',
        id,
        data: { lastReachedAt: new Date().toISOString() },
        overrideAccess: true,
      })
    },
  })
  const fromPartners = partnerRowsForList(partners)

  // Create a record of user ID to membership for quick lookup
  // Note: Using Record instead of Map because Map cannot be serialized to client components
  const membershipByUserId: Record<string, (typeof membershipsData.docs)[0]> = {}
  for (const membership of membershipsData.docs) {
    const userId = typeof membership.user === 'object' ? membership.user?.id : membership.user
    if (userId) {
      membershipByUserId[String(userId)] = membership
    }
  }

  const allRequests = [...requestsData.docs, ...fromPartners.requests]
  const allMemberships = { ...membershipByUserId, ...fromPartners.membershipByUserId }

  return (
    <div className="min-h-screen bg-paper dark:bg-surface">
      <PageHeader
        title={t('members', 'specialRequests')}
        eyebrow={`${allRequests.length}`}
        breadcrumbs={[
          { label: t('common', 'home'), href: '/' },
          { label: t('members', 'specialRequests') },
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        <SpecialRequestsGrid
          requests={allRequests}
          membershipByUserId={allMemberships}
          locale={locale}
          labels={{
            searchPlaceholder: t('common', 'searchPlaceholder'),
            show: t('specialRequestsPage', 'show'),
            ofEntries: t('specialRequestsPage', 'ofEntries'),
            noRequests: t('profile', 'noSpecialRequests'),
            unknown: t('specialRequestsPage', 'unknown'),
            added: t('specialRequestsPage', 'added'),
            updated: t('specialRequestsPage', 'updated'),
            regNumber: t('specialRequest', 'regNumber'),
            requestSingular: t('specialRequestsPage', 'requestSingular'),
            requestPlural: t('specialRequestsPage', 'requestPlural'),
            viewAll: t('specialRequestsPage', 'viewAll'),
            expand: t('specialRequestsPage', 'expand'),
            collapse: t('specialRequestsPage', 'collapse'),
            allRequests: t('specialRequestsPage', 'allRequests'),
            allChapters: t('specialRequestsPage', 'allChapters'),
          }}
          ourChapterName={settings.siteName || undefined}
        />
      </div>
    </div>
  )
}
