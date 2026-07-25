import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware.
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

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return response
}

export function middleware(_request: NextRequest) {
  return addSecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
