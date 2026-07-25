import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isSuperadminHost } from '@/lib/getSiteFromHost'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rateLimit'
import { createAuditLog } from '@/lib/auditLog'

/**
 * POST /api/superadmin/login
 *
 * Superadmin-only login endpoint.
 * SECURITY:
 * 1. Only works on superadmin hosts
 * 2. Only allows users with isSuperadmin = true
 * 3. Sets JWT with adminHostname for session validation
 * 4. Rate limited: 5 attempts per 15 minutes
 * 5. All attempts are logged for audit
 */
export async function POST(request: Request) {
  const headers = await getHeaders()
  const host = headers.get('host') || ''
  const clientIp = getClientIp(headers)
  const userAgent = headers.get('user-agent') || 'unknown'

  // SECURITY: Only allow on superadmin hosts
  if (!isSuperadminHost(host)) {
    return NextResponse.json(
      { error: 'This endpoint is only available on superadmin panel' },
      { status: 403 }
    )
  }

  // SECURITY: Rate limiting - 5 login attempts per 15 minutes per IP
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

    // Attempt login
    const result = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
    })

    // SECURITY: Only allow superadmin users
    if (!result.user?.isSuperadmin) {
      // AUDIT: Log failed login attempt (non-superadmin user)
      await createAuditLog({
        payload,
        action: 'superadmin_login_failed',
        performedByEmail: email,
        details: { reason: 'User is not a superadmin' },
        ipAddress: clientIp,
        userAgent,
      })

      return NextResponse.json(
        { error: 'Access denied. Only superadmin users can access this panel.' },
        { status: 403 }
      )
    }

    // Update user with adminHostname for session validation
    await payload.update({
      collection: 'users',
      id: result.user.id,
      data: {
        adminHostname: host,
        currentSiteId: null,
        currentMembershipId: null,
        currentRole: 'superadmin',
        currentStatus: 'active',
        siteEnableActivities: false,
      },
    })

    // AUDIT: Log successful superadmin login
    await createAuditLog({
      payload,
      action: 'superadmin_login',
      performedById: String(result.user.id),
      performedByEmail: result.user.email,
      details: { host },
      ipAddress: clientIp,
      userAgent,
    })

    // Create response with token cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        surname: result.user.surname,
        isSuperadmin: result.user.isSuperadmin,
      },
    })

    // Set the auth cookie
    if (result.token) {
      response.cookies.set('payload-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 2, // 2 hours
      })
    }

    return response
  } catch (error) {
    console.error('Superadmin login error:', error)

    // Try to log failed login attempt
    try {
      const payload = await getPayload({ config })
      const bodyText = await request.clone().text()
      const body = JSON.parse(bodyText)
      await createAuditLog({
        payload,
        action: 'superadmin_login_failed',
        performedByEmail: body?.email || 'unknown',
        details: { reason: error instanceof Error ? error.message : 'Unknown error' },
        ipAddress: clientIp,
        userAgent,
      })
    } catch {
      // Ignore audit log errors
    }

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
          { error: 'Account is locked. Please try again later.' },
          { status: 423 }
        )
      }
      // Return actual error message for debugging
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
