import { getPayload } from 'payload'
import config from '@payload-config'
import { redirectToNextMeeting } from '@/lib/nextMeeting'

export const dynamic = 'force-dynamic'

/** /guest — the English twin of /viesis. See lib/nextMeeting.ts. */
export async function GET(request: Request) {
  return redirectToNextMeeting(await getPayload({ config }), request.url)
}
