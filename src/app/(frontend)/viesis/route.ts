import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { findNextPublicEvent, guestRegistrationPath } from '@/lib/nextMeeting'

export const dynamic = 'force-dynamic'

/**
 * /viesis — "come as a guest". Sends the visitor to the registration form of
 * the next public meeting, so a button, a QR code on a flyer or a link in a
 * social profile can point here once and never go stale.
 */
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const event = await findNextPublicEvent(payload)
  // 307 rather than 308: where this lands changes every week.
  return NextResponse.redirect(new URL(guestRegistrationPath(event), request.url), 307)
}
