import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
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
    <div className="bg-neutral-50 dark:bg-surface min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm mb-6">
          <Link href="/" className="text-neutral-500 dark:text-neutral-400 hover:text-brand">
            {t('common', 'home')}
          </Link>
          <span className="mx-2 text-neutral-400 dark:text-neutral-500">›</span>
          <span className="text-ink dark:text-surface-text">
            {t('members', 'specialRequests')}
          </span>
        </nav>

        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-ink dark:text-surface-text">
            {t('members', 'specialRequests').toUpperCase()}
          </h1>
          <span className="bg-brand text-white text-lg font-bold px-3 py-1 rounded">
            {requestsData.totalDocs}
          </span>
        </div>

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
