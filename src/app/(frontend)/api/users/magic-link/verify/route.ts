import { NextResponse } from 'next/server'
import { getPayload, getFieldsToSign, jwtSign } from 'payload'
import { addSessionToUser } from 'payload/shared'
import config from '@/payload.config'

export async function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3050'

  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    console.log('Magic link verification started, token:', token?.substring(0, 10) + '...')

    if (!token) {
      console.log('No token provided')
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid or missing token.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const payload = await getPayload({ config })

    const users = await payload.find({
      collection: 'users',
      where: {
        magicLinkToken: {
          equals: token,
        },
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    console.log('Users found:', users.docs.length)

    if (users.docs.length === 0) {
      console.log('No user found with this token')
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid or expired login link.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const user = users.docs[0]
    console.log('User found:', user.email)

    if (!user.magicLinkExpiry) {
      console.log('No magic link expiry set')
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid or expired login link.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const expirationDate = new Date(user.magicLinkExpiry)
    if (expirationDate < new Date()) {
      console.log('Token expired')
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Login link has expired. Please request a new one.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Check if user has any active membership (if not superadmin)
    if (!user.isSuperadmin) {
      const memberships = await payload.find({
        collection: 'site-memberships',
        where: {
          user: { equals: user.id },
          status: { equals: 'active' },
        },
        limit: 1,
      })

      if (memberships.docs.length === 0) {
        console.log('User has no active memberships')
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Your account has been blocked. Please contact support.',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
    }

    // Clear the magic link token
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        magicLinkToken: null,
        magicLinkExpiry: null,
      },
      overrideAccess: true,
    })

    // Get the Users collection config
    const usersCollection = payload.collections['users']
    const collectionConfig = usersCollection.config

    // Get token expiration from auth config
    const authConfig = collectionConfig.auth
    const tokenExpiration =
      typeof authConfig === 'object' && authConfig.tokenExpiration
        ? authConfig.tokenExpiration
        : 7200

    // Create a mock request object for addSessionToUser
    const req = {
      payload,
      user: user as any,
      headers: request.headers,
    } as any

    // Add session to user (like Payload's login does)
    const { sid } = await addSessionToUser({
      collectionConfig,
      payload,
      req,
      user: user as any,
    })

    // Generate JWT token using Payload's pattern
    const fieldsToSignArgs: Parameters<typeof getFieldsToSign>[0] = {
      collectionConfig,
      email: user.email,
      user: user as any,
    }

    if (sid) {
      fieldsToSignArgs.sid = sid
    }

    const fieldsToSign = getFieldsToSign(fieldsToSignArgs)

    console.log('Fields to sign:', Object.keys(fieldsToSign), 'sid:', sid)

    const secret = payload.secret

    const { token: authToken } = await jwtSign({
      fieldsToSign,
      secret,
      tokenExpiration,
    })

    console.log('JWT token generated successfully')

    // Build cookie string
    const cookieParts = [
      `payload-token=${authToken}`,
      'Path=/',
      `Max-Age=${tokenExpiration}`,
      'SameSite=Lax',
      'HttpOnly',
    ]
    if (process.env.NODE_ENV === 'production') {
      cookieParts.push('Secure')
    }
    const cookieString = cookieParts.join('; ')

    console.log('Returning success with Set-Cookie header')

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieString,
      },
    })
  } catch (error) {
    console.error('Error in magic link verification:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Verification failed. Please try again.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
