import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// Shared with server code and the admin role picker. Keeping this list in one
// module matters here: middleware decides whether a request reaches /admin at
// all, so a middleware-local copy that drifted from the rest of the app would
// either lock superadmins out or let a tenant host through.
import { isSuperadminHost } from './lib/constants'

/**
 * SECURE Multi-tenant Middleware
 *
 * Security Model:
 * 1. JWT token contains `adminHostname` (with port) set at login time
 * 2. All protected routes validate that current hostname matches login hostname
 * 3. This prevents cross-site session attacks (CSRF, session hijacking)
 *
 * Protected routes:
 * - /admin/* - Admin panel (redirect to login on mismatch)
 * - /api/* - API routes except public endpoints (401 on mismatch)
 *
 * Note: Collection-level access control provides additional security layer
 * by using hostname-based site detection for all data queries.
 */

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return response
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replaceAll('-', '+').replaceAll('_', '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.codePointAt(0)?.toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

/**
 * Compare hostnames - strips port for comparison to handle port variations
 */
function hostnamesMatch(host1: string | undefined, host2: string): boolean {
  if (!host1) return false
  const h1 = host1.split(':')[0].toLowerCase()
  const h2 = host2.split(':')[0].toLowerCase()
  return h1 === h2
}

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = new Set([
  '/api/users/login',
  '/api/users/logout',
  '/api/users/magic-link',
  '/api/users/forgot-password',
  '/api/users/reset-password',
  '/api/contact',
  '/api/superadmin/login',
  '/api/health',
])

function isPublicApiRoute(pathname: string): boolean {
  // Check exact matches
  if (PUBLIC_API_ROUTES.has(pathname)) return true
  // Check prefix matches (e.g., /api/users/magic-link/verify)
  for (const route of PUBLIC_API_ROUTES) {
    if (pathname.startsWith(route + '/')) return true
  }
  return false
}

interface SessionValidationResult {
  isValid: boolean
  reason?: 'CROSS_SITE_SESSION' | 'SESSION_EXPIRED'
}

function validateSession(token: string, currentHost: string): SessionValidationResult {
  const payload = decodeJwtPayload(token)
  if (!payload) {
    return { isValid: true } // Let Payload handle invalid tokens
  }

  // Superadmins can access any site
  if (payload.isSuperadmin === true) {
    return { isValid: true }
  }

  // Check hostname match - STRICT: adminHostname MUST exist and match for non-superadmins
  const adminHostname = payload.adminHostname as string | undefined
  if (!adminHostname) {
    // Old session without adminHostname - force re-login
    return { isValid: false, reason: 'CROSS_SITE_SESSION' }
  }
  if (!hostnamesMatch(adminHostname, currentHost)) {
    return { isValid: false, reason: 'CROSS_SITE_SESSION' }
  }

  // Check expiration
  const exp = payload.exp as number | undefined
  if (exp && Date.now() >= exp * 1000) {
    return { isValid: false, reason: 'SESSION_EXPIRED' }
  }

  return { isValid: true }
}

function createInvalidSessionResponse(
  request: NextRequest,
  shouldRedirect: boolean,
  reason: 'CROSS_SITE_SESSION' | 'SESSION_EXPIRED',
): NextResponse {
  const errorMessages = {
    CROSS_SITE_SESSION: 'Session invalid for this site. Please login again.',
    SESSION_EXPIRED: 'Session expired. Please login again.',
  }

  let response: NextResponse

  if (shouldRedirect) {
    // For admin and frontend pages, redirect to login
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
    const loginUrl = isAdminRoute ? '/admin/login' : '/login'
    response = NextResponse.redirect(new URL(loginUrl, request.url))
  } else {
    // For API routes, return JSON error
    response = NextResponse.json({ error: errorMessages[reason], code: reason }, { status: 401 })
  }

  response.cookies.delete('payload-token')
  return addSecurityHeaders(response)
}

function handleSuperadminRouting(request: NextRequest, pathname: string): NextResponse | null {
  // Block Payload admin - use custom SPA dashboard at root instead
  if (pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Only allow root, API, auth pages, and static assets
  const allowedPaths =
    pathname === '/' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/.exec(pathname)

  if (!allowedPaths) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return null
}

// The brand-free shared special-requests page: /<32 hex chars>. Declared here rather
// than imported from '@/lib/sharedRequestsLink' so middleware pulls in no node:crypto.
const SHARED_REQUESTS_PATH = /^\/[0-9a-f]{32}$/

// Protected frontend routes that require valid session
const PROTECTED_FRONTEND_ROUTES = ['/my-profile', '/members', '/vcards']

function isProtectedFrontendRoute(pathname: string): boolean {
  return PROTECTED_FRONTEND_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const currentHost = request.headers.get('host') || ''
  const token = request.cookies.get('payload-token')?.value

  const isAdminRoute = pathname.startsWith('/admin')
  const isApiRoute = pathname.startsWith('/api/')
  const isProtectedApiRoute = isApiRoute && !isPublicApiRoute(pathname)
  const isProtectedFrontend = isProtectedFrontendRoute(pathname)

  // === SESSION VALIDATION FOR ALL PROTECTED ROUTES ===
  // This validates admin panel, protected API routes, AND protected frontend pages
  if (token && (isAdminRoute || isProtectedApiRoute || isProtectedFrontend)) {
    const validation = validateSession(token, currentHost)

    if (!validation.isValid && validation.reason) {
      // For frontend pages, redirect to login instead of returning JSON error
      const shouldRedirect = isAdminRoute || isProtectedFrontend
      return createInvalidSessionResponse(request, shouldRedirect, validation.reason)
    }
  }

  // === SUPERADMIN PANEL: SPA at root ===
  if (isSuperadminHost(currentHost)) {
    const superadminResponse = handleSuperadminRouting(request, pathname)
    if (superadminResponse) {
      return superadminResponse
    }
  }

  const response = NextResponse.next()

  // The token-gated shared special-requests page must never be indexed. The page also
  // renders a noindex meta tag; this header covers crawlers that never parse the HTML.
  if (SHARED_REQUESTS_PATH.test(pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  }

  return addSecurityHeaders(response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
