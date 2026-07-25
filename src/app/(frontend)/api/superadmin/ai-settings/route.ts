import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { DEFAULT_AI_SYSTEM_PROMPT } from '@/lib/aiDefaults'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Check if user is superadmin
    const { user } = await payload.auth({ headers: request.headers })
    if (!user?.isSuperadmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the first AI settings document
    const settings = await payload.find({
      collection: 'ai-settings',
      limit: 1,
    })

    if (settings.docs.length === 0) {
      return NextResponse.json({ perplexityApiKey: '', perplexityModel: 'sonar-pro' })
    }

    const doc = settings.docs[0]
    return NextResponse.json({
      id: doc.id,
      perplexityApiKey: doc.perplexityApiKey || '',
      perplexityModel: doc.perplexityModel || 'sonar-pro',
    })
  } catch (error) {
    console.error('Get AI settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Check if user is superadmin
    const { user } = await payload.auth({ headers: request.headers })
    if (!user?.isSuperadmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { perplexityApiKey, perplexityModel } = body

    // Get existing settings
    const settings = await payload.find({
      collection: 'ai-settings',
      limit: 1,
    })

    if (settings.docs.length === 0) {
      // Create new settings document
      const newDoc = await payload.create({
        collection: 'ai-settings',
        data: {
          label: 'Default AI Configuration',
          enabled: false,
          openaiApiKey: 'placeholder',
          model: 'gpt-4o-mini',
          systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
          maxTokens: 1024,
          temperature: 0.7,
          defaultAiCreditUsd: 10,
          perplexityApiKey: perplexityApiKey || '',
          perplexityModel: perplexityModel || 'sonar-pro',
        },
      })
      return NextResponse.json({ success: true, id: newDoc.id })
    }

    // Update existing settings
    const doc = settings.docs[0]
    await payload.update({
      collection: 'ai-settings',
      id: doc.id,
      data: {
        perplexityApiKey: perplexityApiKey || doc.perplexityApiKey,
        perplexityModel: perplexityModel || doc.perplexityModel,
      },
    })

    return NextResponse.json({ success: true, id: doc.id })
  } catch (error) {
    console.error('Update AI settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
