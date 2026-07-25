import { headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import type { CollectionSlug } from 'payload'
import configPromise from '@payload-config'
import { getSiteIdFromHostname } from '../../access/multisite'
import { getHostnameFromRequest, isSuperadminHost } from '../../lib/hostname'

interface Props {
  collectionSlug: CollectionSlug
}

/**
 * Server component that redirects to the first (and only) document in a
 * singleton-like collection — before any list view is rendered.
 *
 * Previously this was a client component that mounted, fired a fetch,
 * waited for the response, then did a router.replace(). On a stock
 * Next.js dev mode that meant: list page compiles → list RSC renders →
 * client mount → fetch (often doubled by React strict mode) → detail
 * page compiles. Total: 3–5s spinner for what should be an instant
 * redirect.
 *
 * Doing it as a server component performs one find + one 307 redirect.
 * No double fetch, no client mount, no intermediate list render.
 *
 * Auth + multi-tenant safety:
 *   - We re-authenticate via payload.auth(headers) and bail to login if
 *     there's no session — so this never leaks data.
 *   - Site filtering by hostname is applied explicitly (the access
 *     functions can't run reliably from a synthetic server-component
 *     req, so we mirror their logic here and overrideAccess for the
 *     find call itself).
 */
export const SingletonRedirect = async ({ collectionSlug }: Props) => {
  const headers = await nextHeaders()
  const payload = await getPayload({ config: await configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect('/admin/login')
  }

  const hostname = getHostnameFromRequest({ headers })

  // On the superadmin panel singleton settings have no site context.
  if (isSuperadminHost(hostname)) {
    redirect('/admin')
  }

  const siteId = await getSiteIdFromHostname(hostname, payload)
  if (!siteId) {
    redirect('/admin')
  }

  const result = await payload.find({
    collection: collectionSlug,
    limit: 1,
    depth: 0,
    where: { site: { equals: siteId } },
    overrideAccess: true,
  })

  const docId = result.docs[0]?.id
  if (docId !== undefined) {
    redirect(`/admin/collections/${collectionSlug}/${docId}`)
  }
  redirect(`/admin/collections/${collectionSlug}/create`)
}

export default SingletonRedirect
