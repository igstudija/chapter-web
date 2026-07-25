import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { PRIMARY_SUPERADMIN_HOST } from '@/lib/constants'
import OpenAI from 'openai'

// Generic tags to filter out
const BANNED_TAGS = [
  'sia',
  'uzņēmējdarbība',
  'komersants',
  'juridiskā persona',
  'b2b',
  'b2c',
  'pakalpojumi',
  'kvalitāte',
  'uzņēmums',
  'bizness',
  'company',
  'business',
  'services',
  'products',
  'profesionāls',
  'profesionāli',
  'profesionalitāte',
  'uzticams',
  'uzticamība',
  'pieredze',
  'kvalitāte',
  'inovācijas',
  'attīstība',
  'izaugsme',
  'sadarbība',
  'partnerība',
  'klienti',
  'risinājumi',
  'it',
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

interface Top40Entry {
  id: number
  companyName: string
  contactPerson: string
  position?: string | null
  registrationNumber?: string | null
  notes?: string | null
  businessTags?: string | null
}

async function generateBusinessTags(
  perplexity: OpenAI,
  model: string,
  company: Top40Entry,
): Promise<string[]> {
  const prompt = `Search for information about this Latvian company and generate 12-20 SPECIFIC business tags that describe what they actually do.

Company name: ${company.companyName}
${company.registrationNumber ? `Registration number: ${company.registrationNumber}` : ''}
${company.position ? `Contact position: ${company.position}` : ''}
${company.notes ? `Notes: ${company.notes}` : ''}

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

  try {
    const response = await perplexity.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a Latvian business analyst. Search the web to find real information about companies and categorize them with many specific, meaningful industry tags. Generate 12-20 diverse tags covering all aspects of the business. Never use generic business terms or specific client names. Always respond with a valid JSON array of strings only.',
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
    if (jsonMatch) {
      const rawTags = JSON.parse(jsonMatch[0]) as string[]
      const validTags = rawTags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
      return filterBadTags(validTags)
    }
    return []
  } catch (error) {
    console.error(`Error generating tags for ${company.companyName}:`, error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Check if user is superadmin
    const { user } = await payload.auth({ headers: request.headers })
    if (!user?.isSuperadmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await request.json()
    const { apiKey, model, siteId } = body

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const perplexity = new OpenAI({
      apiKey,
      baseURL: 'https://api.perplexity.ai',
    })

    // Build query for Top40 entries
    const whereQuery: any = {}
    if (siteId && siteId !== 'all') {
      whereQuery.site = { equals: parseInt(siteId, 10) }
    }

    // Fetch Top40 entries
    const top40Entries = await payload.find({
      collection: 'top40',
      where: whereQuery,
      limit: 10000,
      depth: 0,
    })

    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        send({
          type: 'start',
          total: top40Entries.docs.length,
          message: `Atrasti ${top40Entries.docs.length} Top40 ieraksti`,
        })

        let processed = 0
        let updated = 0
        let skipped = 0
        let errors = 0

        for (const entry of top40Entries.docs as Top40Entry[]) {
          processed++

          // Skip if already has tags
          if (entry.businessTags && entry.businessTags.trim().length > 0) {
            const tagCount = entry.businessTags.split(',').length
            send({
              type: 'skip',
              processed,
              total: top40Entries.docs.length,
              company: entry.companyName,
              message: `⏭️ ${entry.companyName} - jau ir ${tagCount} tagi`,
            })
            skipped++
            continue
          }

          send({
            type: 'processing',
            processed,
            total: top40Entries.docs.length,
            company: entry.companyName,
            message: `🔍 Meklē: ${entry.companyName}...`,
          })

          // Generate tags
          const tags = await generateBusinessTags(perplexity, model || 'sonar-pro', entry)

          if (tags.length === 0) {
            send({
              type: 'error',
              processed,
              total: top40Entries.docs.length,
              company: entry.companyName,
              message: `⚠️ ${entry.companyName} - neizdevās ģenerēt tagus`,
            })
            errors++
            continue
          }

          // Update entry (comma separated tags)
          try {
            await payload.update({
              collection: 'top40',
              id: entry.id,
              data: {
                businessTags: tags.join(', '),
              },
              overrideAccess: true,
              context: { skipValidation: true },
              req: {
                user: { id: 0, isSuperadmin: true },
                payload,
                headers: new Headers({ host: PRIMARY_SUPERADMIN_HOST }),
              } as any,
            })

            send({
              type: 'success',
              processed,
              total: top40Entries.docs.length,
              company: entry.companyName,
              tags,
              message: `✅ ${entry.companyName} - ${tags.length} tagi: ${tags.slice(0, 5).join(', ')}${tags.length > 5 ? '...' : ''}`,
            })
            updated++
          } catch (error) {
            send({
              type: 'error',
              processed,
              total: top40Entries.docs.length,
              company: entry.companyName,
              message: `❌ ${entry.companyName} - kļūda saglabājot`,
            })
            errors++
          }

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }

        send({
          type: 'complete',
          processed,
          updated,
          skipped,
          errors,
          message: `🏁 Pabeigts! Apstrādāti: ${processed}, Atjaunināti: ${updated}, Izlaisti: ${skipped}, Kļūdas: ${errors}`,
        })

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Generate tags error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
