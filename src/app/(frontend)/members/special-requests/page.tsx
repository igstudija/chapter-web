import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { PageHeader } from '@/components'
import { SpecialRequestsGrid } from '@/components/SpecialRequestsGrid'

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

  // Fetch requests and memberships in parallel
  const [requestsData, membershipsData] = await Promise.all([
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
  ])

  // Create a record of user ID to membership for quick lookup
  // Note: Using Record instead of Map because Map cannot be serialized to client components
  const membershipByUserId: Record<string, (typeof membershipsData.docs)[0]> = {}
  for (const membership of membershipsData.docs) {
    const userId = typeof membership.user === 'object' ? membership.user?.id : membership.user
    if (userId) {
      membershipByUserId[String(userId)] = membership
    }
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-surface">
      <PageHeader
        title={t('members', 'specialRequests')}
        eyebrow={`${requestsData.totalDocs}`}
        breadcrumbs={[
          { label: t('common', 'home'), href: '/' },
          { label: t('members', 'specialRequests') },
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        <SpecialRequestsGrid
          requests={requestsData.docs}
          membershipByUserId={membershipByUserId}
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
          }}
        />
      </div>
    </div>
  )
}
