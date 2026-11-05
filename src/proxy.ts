import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { contentSecurityPolicy } from '@/lib/csp'

/**
 * Proxy (Next 16's name for middleware).
 *
 * Security headers, and nothing else.
 *
 * It used to carry the multi-tenant security model: every request's hostname
 * was resolved to an organisation, and sessions were pinned to the host they
 * were issued on so a token minted for one organisation could not be replayed
 * against another. With a single install there is one organisation and one
 * host, so a session is valid wherever it is presented, and authentication is
 * Payload's job — collection access control enforces it at the data layer,
 * where it cannot be bypassed by reaching a route another way.
 */

const isAdminOrApi = (pathname: string) =>
  pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/')

function addSecurityHeaders(response: NextResponse, csp: string | null): NextResponse {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  // X-XSS-Protection is gone on purpose: browsers removed the filter it
  // controlled, and the old IE/Chrome behaviour it switched on could itself
  // be abused to blank parts of a page. CSP is what does that job now.
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (process.env.NODE_ENV === 'production') {
    // Two years, subdomains included. Not `preload`: getting onto the browsers'
    // built-in list is a one-way door that should be a deliberate decision.
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
  }
  if (csp) response.headers.set('Content-Security-Policy', csp)
  return response
}

/**
 * Payload's /api/access describes every collection, field and rule as the
 * caller sees them. The admin panel needs it once signed in; a signed-out
 * visitor gets a map of the data model and nothing they could use. A request
 * with no session cookie and no Authorization header is answered here.
 */
const isAnonymousAccessMapRequest = (request: NextRequest) =>
  request.nextUrl.pathname === '/api/access' &&
  !request.cookies.has('payload-token') &&
  !request.headers.has('authorization')

export function proxy(request: NextRequest) {
  if (isAnonymousAccessMapRequest(request)) {
    return addSecurityHeaders(
      NextResponse.json({ errors: [{ message: 'Unauthorized' }] }, { status: 401 }),
      null,
    )
  }

  if (isAdminOrApi(request.nextUrl.pathname)) {
    return addSecurityHeaders(NextResponse.next(), null)
  }

  const nonce = btoa(crypto.randomUUID())
  const https =
    request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === 'development', https)

  // Next.js finds the nonce in the *request* CSP header and applies it to the
  // scripts it renders; x-nonce is how the layout reads it for ours.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  return addSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), csp)
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icons/).*)',
      // Prefetches render no HTML of their own, so they need no nonce.
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
