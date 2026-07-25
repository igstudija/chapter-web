import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isSuperadminHost } from '@/lib/getSiteFromHost'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rateLimit'
import { devLog, devError } from '@/lib/hostname'
import { resolveSiteFromHost } from '@/lib/resolveSite'

/**
 * POST /api/auth/login
 *
 * Custom login endpoint for chapter sites that fixes the race condition
 * in the beforeLogin hook by updating context fields BEFORE calling payload.login().
 *
 * Flow:
 * 1. Find user by email (without password validation)
 * 2. Determine site context (site, membership, role)
 * 3. Update user context fields in DB
 * 4. Call payload.login() - JWT will now include correct fields
 *
 * SECURITY:
 * - Rate limited: 5 attempts per 15 minutes per IP
 * - Validates membership status (blocked users denied)
 * - Cross-site protection via adminHostname in JWT
 */
export async function POST(request: Request) {
  const headers = await getHeaders()
  const host = headers.get('host') || ''
  const hostname = host.split(':')[0]
  const clientIp = getClientIp(headers)

  devLog('auth/login', '====== CUSTOM LOGIN START ======')
  devLog('auth/login', 'Host:', host)

  // Redirect superadmin hosts to their dedicated endpoint
  if (isSuperadminHost(host)) {
    return NextResponse.json(
      { error: 'Please use /api/superadmin/login for superadmin panel' },
      { status: 400 }
    )
  }

  // Rate limiting - 5 login attempts per 15 minutes per IP
  const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.SUPERADMIN_LOGIN)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 900),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimitResult.resetAt),
        },
      }
    )
  }

  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Step 1: Find user by email (without password validation yet)
    const users = await payload.find({
      collection: 'users',
      where: { email: { equals: email.toLowerCase().trim() } },
      limit: 1,
    })

    const user = users.docs[0]
    if (!user) {
      // Don't reveal if user exists - return generic error
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    devLog('auth/login', 'User found:', user.id, user.email)
    devLog('auth/login', 'Is superadmin:', user.isSuperadmin)

    // Step 2: Determine site context
    let currentSiteId: string | null = null
    let siteEnableActivities = false
    let membership = null

    // Get site from hostname. Same resolver the access layer uses, so the site
    // baked into the JWT here cannot disagree with the site the user's requests
    // will subsequently be scoped to.
    try {
      const { site } = await resolveSiteFromHost(payload, hostname)
      currentSiteId = site?.id != null ? String(site.id) : null
      siteEnableActivities = site?.enableActivities || false
    } catch {
      // Leave the login unscoped rather than failing it; access control still
      // resolves the site per-request from the hostname.
    }

    devLog('auth/login', 'Current site ID:', currentSiteId)

    // Step 3: Find user's membership in this site
    if (currentSiteId) {
      try {
        const memberships = await payload.find({
          collection: 'site-memberships',
          where: {
            user: { equals: user.id },
            site: { equals: currentSiteId },
          },
          limit: 1,
        })
        membership = memberships.docs[0] || null
      } catch (e) {
        devError('auth/login', 'Error finding membership:', e)
      }
    }

    devLog('auth/login', 'Membership found:', membership?.id)

    // Validate membership access
    if (!membership && !user.isSuperadmin) {
      devLog('auth/login', 'No membership found - denying login')
      return NextResponse.json(
        { error: 'You are not a member of this chapter. Please contact the administrator.' },
        { status: 403 }
      )
    }

    // Check if membership is blocked
    if (membership?.status === 'blocked' && !user.isSuperadmin) {
      devLog('auth/login', 'Membership is blocked - denying login')
      return NextResponse.json(
        { error: 'Your membership in this chapter is blocked. Please contact the administrator.' },
        { status: 403 }
      )
    }

    // Determine effective role
    const effectiveRole = user.isSuperadmin ? 'superadmin' : membership?.role || null
    const membershipId = membership?.id ? String(membership.id) : null

    // Step 4: Update context fields in DB BEFORE calling payload.login()
    // This is the KEY FIX - fields are now in DB before JWT generation
    try {
      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          adminHostname: host,
          currentSiteId: currentSiteId,
          currentMembershipId: membershipId,
          currentRole: effectiveRole,
          currentStatus: membership?.status || (user.isSuperadmin ? 'active' : null),
          siteEnableActivities: siteEnableActivities,
        },
      })
      devLog('auth/login', 'Context fields pre-saved to database')
    } catch (e) {
      devError('auth/login', 'Error pre-saving context fields:', e)
      // Continue anyway - beforeLogin hook will try again
    }

    // Step 5: Call payload.login() - JWT will now have correct fields from DB
    // The beforeLogin hook will still run but fields are already in DB
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })

    devLog('auth/login', '====== CUSTOM LOGIN SUCCESS ======')

    // Create response with token cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        surname: result.user.surname,
      },
    })

    // Set the auth cookie
    if (result.token) {
      response.cookies.set('payload-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 2, // 2 hours (matches auth.tokenExpiration)
      })
    }

    return response
  } catch (error) {
    devError('auth/login', 'Login error:', error)

    // Check for specific Payload auth errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      if (message.includes('credentials') || message.includes('incorrect') || message.includes('invalid')) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
      if (message.includes('locked')) {
        return NextResponse.json(
          { error: 'Account is locked due to too many failed attempts. Please try again later.' },
          { status: 423 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
