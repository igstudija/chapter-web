import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Find user with this token
    const users = await payload.find({
      collection: 'users',
      where: {
        emailChangeToken: { equals: token },
      },
      limit: 1,
    })

    if (users.docs.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    const user = users.docs[0]

    // Check if token has expired
    if (!user.emailChangeExpiry || new Date(user.emailChangeExpiry) < new Date()) {
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 })
    }

    // Check if pending email exists
    if (!user.pendingEmail) {
      return NextResponse.json({ error: 'No pending email change' }, { status: 400 })
    }

    // Update email and clear pending fields
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        emailChangeToken: null,
        emailChangeExpiry: null,
      },
      overrideAccess: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Email changed successfully',
      newEmail: user.pendingEmail,
    })
  } catch (error) {
    console.error('Error verifying email change:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 },
    )
  }
}
