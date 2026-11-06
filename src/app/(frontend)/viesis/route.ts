import { getPayload } from 'payload'
import config from '@payload-config'
import { redirectToNextMeeting } from '@/lib/nextMeeting'

export const dynamic = 'force-dynamic'

/**
 * /viesis — "come as a guest", in Latvian. Sends the visitor to the
 * registration form of the next public meeting, so a button, a QR code on a
 * flyer or a link in a social profile can point here once and never go stale.
 * /guest is the same link in English; see lib/nextMeeting.ts.
 */
export async function GET(request: Request) {
  return redirectToNextMeeting(await getPayload({ config }), request.url)
}
