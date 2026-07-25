import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rateLimit'

/**
 * POST /api/auth/login
 *
 * Member login. Wraps Payload's own login with IP rate limiting and sets the
 * session cookie.
 *
 * Most of what used to be here was multi-tenancy: the endpoint existed to
 * resolve the request's host to an organisation, find the caller's membership
 * in it, and write role/site/membership context to the user row *before*
 * calling `payload.login()`, because the JWT is built from the database and a
 * `beforeLogin` hook's return value came too late. Role and status are ordinary
 * user fields now, so `payload.login()` is the whole operation. A blocked
 * account is refused by the `beforeLogin` hook on the collection.
 */
export async function POST(request: Request) {
  const headers = await getHeaders()

  const rateLimitResult = checkRateLimit(getClientIp(headers), RATE_LIMITS.LOGIN)
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
      },
    )
  }

  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const payload = await getPayload({ config })
    const result = await payload.login({
      collection: 'users',
      data: { email: String(email).toLowerCase().trim(), password },
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        surname: result.user.surname,
      },
    })

    if (result.token) {
      response.cookies.set('payload-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 2, // matches auth.tokenExpiration
      })
    }

    return response
  } catch (error) {
    // Blocked accounts throw from the collection's beforeLogin hook; surface
    // that reason, but keep every other failure indistinguishable so the
    // endpoint cannot be used to tell which addresses have accounts.
    const message = error instanceof Error ? error.message : ''
    if (message.includes('blocked')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }

    console.error('[auth/login] Login failed:', message)
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }
}
