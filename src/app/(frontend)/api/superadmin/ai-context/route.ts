import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { isSuperadminHost } from '@/lib/getSiteFromHost'
import { buildAiContext, buildSystemPromptWithContext } from '@/lib/aiContext'

/**
 * GET /api/superadmin/ai-context?siteId=X
 *
 * Returns the AI context data for a given site.
 * Allows superadmin to preview what data gets sent to the AI.
 */
export async function GET(request: Request) {
  const headers = await getHeaders()
  const host = headers.get('host') || ''

  if (!isSuperadminHost(host)) {
    return NextResponse.json(
      { error: 'This endpoint is only available on superadmin panel' },
      { status: 403 },
    )
  }

  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers })
  if (!user || !user.isSuperadmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const siteId = url.searchParams.get('siteId')

  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
  }

  try {
    // Get the site name
    const site = await payload.findByID({
      collection: 'sites',
      id: siteId,
      overrideAccess: true,
    })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Build context
    const context = await buildAiContext(payload, site.id, site.name)

    // Get AI settings for the full system prompt preview
    const aiSettingsResult = await payload.find({
      collection: 'ai-settings',
      limit: 1,
      overrideAccess: true,
    })
    const aiSettings = aiSettingsResult.docs[0]

    const fullSystemPrompt = aiSettings
      ? buildSystemPromptWithContext(aiSettings.systemPrompt, context)
      : null

    return NextResponse.json({
      siteName: context.siteName,
      members: context.members,
      top40: context.top40,
      fullSystemPrompt,
    })
  } catch (error) {
    console.error('Error building AI context:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to build AI context: ${errorMessage}` },
      { status: 500 },
    )
  }
}
