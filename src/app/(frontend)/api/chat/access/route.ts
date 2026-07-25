import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { getSiteFromHost } from '@/lib/getSiteFromHost'
import { getEurUsdRate } from '@/lib/exchangeRate'

/**
 * GET /api/chat/access
 *
 * Returns whether the current user can access the AI chatbot.
 * Used by the frontend to conditionally render the chat widget.
 */
export async function GET() {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ allowed: false, reason: 'unauthenticated' })
  }

  const userWithContext = user as UserWithContext

  // Role check
  if (!userWithContext.isSuperadmin && userWithContext.currentRole !== 'member-admin') {
    return NextResponse.json({ allowed: false, reason: 'role' })
  }

  // Check AI enabled
  const aiSettingsResult = await payload.find({
    collection: 'ai-settings',
    limit: 1,
  })
  const aiSettings = aiSettingsResult.docs[0]
  if (!aiSettings || !aiSettings.enabled) {
    return NextResponse.json({ allowed: false, reason: 'disabled' })
  }

  // Site check
  const host = headers.get('host')
  const currentSite = await getSiteFromHost(host)
  if (!currentSite) {
    return NextResponse.json({ allowed: false, reason: 'no_site' })
  }

  // Check if AI chat is enabled for this site
  if (!currentSite.enableAiChat) {
    return NextResponse.json({ allowed: false, reason: 'disabled' })
  }

  const top40Data = await payload.find({
    collection: 'top40',
    where: {
      and: [
        { submittedBy: { equals: user.id } },
        { site: { equals: currentSite.id } },
      ],
    },
    limit: 0,
  })

  if (top40Data.totalDocs < 40) {
    return NextResponse.json({
      allowed: false,
      reason: 'top40_incomplete',
      current: top40Data.totalDocs,
      required: 40,
    })
  }

  // Fetch EUR/USD rate for frontend display
  const eurRate = await getEurUsdRate()

  // Credit balance check (superadmins have unlimited access)
  if (userWithContext.isSuperadmin) {
    return NextResponse.json({ allowed: true, balance: null, eurRate })
  }

  const membershipResult = await payload.find({
    collection: 'site-memberships',
    where: {
      and: [
        { user: { equals: user.id } },
        { site: { equals: currentSite.id } },
      ],
    },
    limit: 1,
    depth: 0,
  })
  const membership = membershipResult.docs[0]
  const balance = membership ? ((membership as any).aiCreditBalanceUsd ?? 0) : 0

  if (balance <= 0) {
    return NextResponse.json({
      allowed: false,
      reason: 'insufficient_credit',
      balance,
      eurRate,
    })
  }

  return NextResponse.json({ allowed: true, balance, eurRate })
}
