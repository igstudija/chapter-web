import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ message: 'Token and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config })

    const users = await payload.find({
      collection: 'users',
      where: {
        customResetToken: {
          equals: token,
        },
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (users.docs.length === 0) {
      return NextResponse.json({ message: 'Invalid or expired reset token' }, { status: 400 })
    }

    const user = users.docs[0]

    if (!user.customResetExpiry) {
      return NextResponse.json({ message: 'Invalid or expired reset token' }, { status: 400 })
    }

    const expirationDate = new Date(user.customResetExpiry)
    if (expirationDate < new Date()) {
      return NextResponse.json(
        { message: 'Reset token has expired. Please request a new one.' },
        { status: 400 },
      )
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        password: password,
        customResetToken: null,
        customResetExpiry: null,
      },
      overrideAccess: true,
    })

    return NextResponse.json({ message: 'Password has been reset successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error in reset password:', error)
    return NextResponse.json(
      { message: 'An error occurred. Please try again later.' },
      { status: 500 },
    )
  }
}
