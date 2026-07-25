import { headers as getHeaders } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSiteFromHost } from '@/lib/getSiteFromHost'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import {
  SHARED_REQUESTS_TOKEN_PATTERN,
  getSharedRequestsTokenExpiry,
  isValidSharedRequestsToken,
} from '@/lib/sharedRequestsLink'
import {
  SharedSpecialRequests,
  type SharedChapter,
} from '@/components/SharedSpecialRequests'
import { getDirectorySearchTemplate } from '@/lib/directorySearch'
import { orgShortName } from '@/lib/branding'

// The token rotates weekly, so this page must never be cached across that boundary.
export const dynamic = 'force-dynamic'

export default async function SharedSpecialRequestsPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // A path that cannot be a token at all is just an unknown URL — 404 it rather than
  // bouncing every typo on the site to the homepage.
  if (!SHARED_REQUESTS_TOKEN_PATTERN.test(token)) {
    notFound()
  }

  // Correctly shaped but expired or forged: last week's link quietly lands on home.
  if (!isValidSharedRequestsToken(token)) {
    redirect('/')
  }

  const headersList = await getHeaders()
  const currentSite = await getSiteFromHost(headersList.get('host'))
  if (!currentSite) {
    notFound()
  }

  const locale = (currentSite.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)
  const payload = await getPayload({ config })

  // The whole point of this page is that it merges the chapters, so it reads across
  // every opted-in site — not just the one whose domain was used to open it.
  const sitesData = await payload.find({
    collection: 'sites',
    where: {
      status: { equals: 'active' },
      includeInSharedRequests: { equals: true },
    },
    sort: 'name',
    limit: 50,
    overrideAccess: true,
  })

  const chapters: SharedChapter[] = await Promise.all(
    sitesData.docs.map(async (site) => {
      // overrideAccess is required: `special-requests.read` is siteScopedActiveMember,
      // and this page is intentionally served to anonymous visitors.
      const [requestsData, membershipsData] = await Promise.all([
        payload.find({
          collection: 'special-requests',
          where: { site: { equals: site.id } },
          limit: 1000,
          sort: '-createdAt',
          depth: 2,
          overrideAccess: true,
        }),
        payload.find({
          collection: 'site-memberships',
          where: { site: { equals: site.id }, status: { equals: 'active' } },
          limit: 500,
          depth: 2,
          overrideAccess: true,
        }),
      ])

      const companyByUserId: Record<string, string> = {}
      const activeUserIds = new Set<string>()
      for (const membership of membershipsData.docs) {
        const userId = typeof membership.user === 'object' ? membership.user?.id : membership.user
        if (userId == null) continue
        activeUserIds.add(String(userId))
        if (membership.company) {
          companyByUserId[String(userId)] = membership.company
        }
      }

      const requests = requestsData.docs
        // `isPublic` is opt-out on the collection and ignored by the members-only list,
        // but this link leaves the members area — so honour it here.
        .filter((request) => request.isPublic !== false)
        .map((request) => {
          const requester =
            request.requestedBy && typeof request.requestedBy === 'object'
              ? request.requestedBy
              : null
          if (!requester || !activeUserIds.has(String(requester.id))) return null

          return {
            id: request.id,
            request: request.request,
            registrationNumber: request.registrationNumber ?? null,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            showOnSlide: request.showOnSlide ?? false,
            requestedBy: {
              id: requester.id,
              name: requester.name,
              surname: requester.surname,
            },
          }
        })
        .filter((request) => request !== null)

      return {
        siteId: String(site.id),
        name: site.name,
        // Compact badge text. Organisations whose names share a prefix
        // ("Acme Riga", "Acme Tallinn") set `shortName` so the badges stay
        // distinguishable; otherwise the full name is used.
        label: orgShortName(site),
        requests,
        companyByUserId,
      }
    }),
  )

  return (
    <SharedSpecialRequests
      chapters={chapters}
      locale={locale}
      validUntil={getSharedRequestsTokenExpiry().toISOString()}
      directorySearchTemplate={getDirectorySearchTemplate()}
      labels={{
        chapter: t('sharedRequests', 'chapter'),
        period: t('sharedRequests', 'period'),
        all: t('sharedRequests', 'all'),
        thisWeek: t('sharedRequests', 'thisWeek'),
        thisMonth: t('sharedRequests', 'thisMonth'),
        directoryProfile: t('sharedRequests', 'directoryProfile'),
        title: t('sharedRequests', 'title'),
        subtitle: t('sharedRequests', 'subtitle'),
        validUntil: t('sharedRequests', 'validUntil'),
        members: t('sharedRequests', 'members'),
        requests: t('sharedRequests', 'requests'),
        noRequests: t('sharedRequests', 'noRequests'),
        searchPlaceholder: t('sharedRequests', 'searchPlaceholder'),
        regNumber: t('specialRequest', 'regNumber'),
        // Wording lives in `sharedRequests` rather than reusing the members-only list's
        // keys: this page says "prasījumi", the chapter list says "pieprasījumi".
        added: t('sharedRequests', 'added'),
        updated: t('sharedRequests', 'updated'),
        unknown: t('sharedRequests', 'unknown'),
        requestSingular: t('sharedRequests', 'requestSingular'),
        requestPlural: t('sharedRequests', 'requestPlural'),
        expand: t('sharedRequests', 'expand'),
        collapse: t('sharedRequests', 'collapse'),
        allRequests: t('sharedRequests', 'allRequests'),
      }}
    />
  )
}
