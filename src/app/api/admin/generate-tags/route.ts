import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import OpenAI from 'openai'
import { isUserAdmin, type UserWithContext } from '@/lib/userHelpers'

// Generic tags to filter out
const BANNED_TAGS = [
  'sia', 'uzņēmējdarbība', 'komersants', 'juridiskā persona', 'b2b', 'b2c',
  'pakalpojumi', 'kvalitāte', 'uzņēmums', 'bizness', 'company', 'business',
  'services', 'products', 'profesionāls', 'profesionāli', 'profesionalitāte',
  'uzticams', 'uzticamība', 'pieredze', 'kvalitāte', 'inovācijas', 'attīstība',
  'izaugsme', 'sadarbība', 'partnerība', 'klienti', 'risinājumi', 'it',
]

function filterBadTags(tags: string[]): string[] {
  return tags.filter((tag) => {
    const normalized = tag.toLowerCase().trim()
    if (BANNED_TAGS.some((banned) => normalized === banned || normalized.includes(banned))) {
      return false
    }
    if (tag.length < 3 || tag.length > 50) {
      return false
    }
    return true
  })
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Check if user is authenticated
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isUserAdmin(user as UserWithContext)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { companyName, contactPerson, position, registrationNumber, notes } = body

    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    // The key used to be stored on an AI Settings collection that the
    // superadmin console managed. It is an environment variable now, like
    // every other outbound credential.
    if (!process.env.PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { error: 'PERPLEXITY_API_KEY is not configured' },
        { status: 400 },
      )
    }

    const perplexity = new OpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      baseURL: 'https://api.perplexity.ai',
    })

    const model = process.env.PERPLEXITY_MODEL || 'sonar-pro'

    const prompt = `Search for information about this Latvian company and generate 12-20 SPECIFIC business tags that describe what they actually do.

Company name: ${companyName}
${registrationNumber ? `Registration number: ${registrationNumber}` : ''}
${position ? `Contact position: ${position}` : ''}
${notes ? `Notes: ${notes}` : ''}

IMPORTANT RULES:
1. Search the web thoroughly to find what this company actually does
2. Generate MANY SPECIFIC tags about their:
   - Industry and sector
   - Specific services offered
   - Technologies used
   - Target markets/clients
   - Product types
   - Specializations
3. DO NOT use generic tags like: "SIA", "Uzņēmējdarbība", "Komersants", "Juridiskā persona", "B2B", "B2C", "Pakalpojumi", "IT", "Pieredze", "Kvalitāte"
4. DO NOT include specific client/project names - only general service categories
5. Tags should be in Latvian
6. Each tag should be 1-4 words describing a specific service, product, or industry niche

GOOD examples: "Metālapstrāde", "CNC frēzēšana", "Grāmatvedības ārpakalpojumi", "Loģistikas risinājumi", "Ēku siltināšana", "Digitālais mārketings", "PVC logi un durvis", "React izstrāde", "E-komercijas platformas"

BAD examples: "SIA", "Uzņēmējdarbība", "Komersants", "B2B pakalpojumi", "Kvalitāte", "Orkla projekts", "Spilva mājaslapa"

Return ONLY a JSON array of strings, nothing else.`

    const response = await perplexity.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a Latvian business analyst. Search the web to find real information about companies and categorize them with many specific, meaningful industry tags. Generate 12-20 diverse tags covering all aspects of the business. Never use generic business terms or specific client names. Always respond with a valid JSON array of strings only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content || '[]'
    const jsonMatch = content.match(/\[[\s\S]*\]/)

    if (!jsonMatch) {
      return NextResponse.json({ error: 'Neizdevās parsēt atbildi' }, { status: 500 })
    }

    const rawTags = JSON.parse(jsonMatch[0]) as string[]
    const validTags = rawTags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
    const filteredTags = filterBadTags(validTags)

    if (filteredTags.length === 0) {
      return NextResponse.json({ error: 'Neizdevās ģenerēt tagus' }, { status: 500 })
    }

    return NextResponse.json({ tags: filteredTags.join(', ') })
  } catch (error) {
    console.error('Generate single tags error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
