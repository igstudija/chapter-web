import { headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import type { CollectionSlug } from 'payload'
import configPromise from '@payload-config'

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
 * It re-authenticates via `payload.auth(headers)` and bails to login when there
 * is no session, so it never leaks data. It used to also resolve the request's
 * host to an organisation and filter by it — these collections held one
 * document *per organisation*. Now they hold one document, full stop.
 */
export const SingletonRedirect = async ({ collectionSlug }: Props) => {
  const headers = await nextHeaders()
  const payload = await getPayload({ config: await configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect('/admin/login')
  }

  const result = await payload.find({
    collection: collectionSlug,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const docId = result.docs[0]?.id
  if (docId !== undefined) {
    redirect(`/admin/collections/${collectionSlug}/${docId}`)
  }
  redirect(`/admin/collections/${collectionSlug}/create`)
}

export default SingletonRedirect
