import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { serveExchange } from '@/lib/chapterExchange/serveExchange'

/**
 * GET /api/special-request-exchange/v1
 *
 * What a linked chapter reads from this install. The path names what it
 * carries: a later feature wanting to trade something else is a second
 * endpoint, not a rename that would cut off every working partner (ADR 0007).
 *
 * The whole shareable set comes back in one response. A chapter is tens to a
 * couple of hundred requests, so paging across installs would be machinery
 * built for a scale that does not exist.
 */
export async function GET() {
  const headers = await getHeaders()
  const payload = await getPayload({ config })

  const { status, body } = await serveExchange({
    payload,
    authorization: headers.get('authorization'),
    origin: process.env.NEXT_PUBLIC_SERVER_URL || '',
  })

  // A 401 says nothing about why. That a secret was well-formed but unknown, or
  // known but paused, is worth nothing to a legitimate partner.
  if (!body) return new NextResponse(null, { status })

  // The reader decides how long to hold this. Nothing in between should: the
  // response is authenticated, and it differs for every partner.
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
}
