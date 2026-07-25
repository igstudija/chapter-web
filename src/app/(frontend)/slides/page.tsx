import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import SlidesPageClient from './page-client'

export const dynamic = 'force-dynamic'

interface SearchParams {
  place?: 'onsite' | 'online'
  token?: string
}

export default async function SlidesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const headersList = await headers()
  const params = await searchParams
  const payload = await getPayload({ config })

  // Check authentication
  const { user } = await payload.auth({ headers: headersList })
  if (!user) {
    redirect('/login')
  }

  // Get startMemberId from params if provided
  const startMemberId = params.token

  return <SlidesPageClient startMemberId={startMemberId} />
}
