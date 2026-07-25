import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { PRIMARY_SUPERADMIN_HOST } from '../lib/constants'
import OpenAI from 'openai'

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

if (!PERPLEXITY_API_KEY) {
  console.error('❌ PERPLEXITY_API_KEY environment variable is required')
  console.log('   Set it in .env or run: PERPLEXITY_API_KEY=pplx-xxx npx tsx src/scripts/generateTop40Tags.ts')
  process.exit(1)
}

// Generic tags to filter out
const BANNED_TAGS = [
  'sia', 'uzņēmējdarbība', 'komersants', 'juridiskā persona', 'b2b', 'b2c',
  'pakalpojumi', 'kvalitāte', 'uzņēmums', 'bizness', 'company', 'business',
  'services', 'products', 'profesionāls', 'profesionāli', 'profesionalitāte',
  'uzticams', 'uzticamība', 'pieredze', 'kvalitāte', 'inovācijas', 'attīstība',
  'izaugsme', 'sadarbība', 'partnerība', 'klienti', 'risinājumi',
]

function filterBadTags(tags: string[]): string[] {
  return tags.filter((tag) => {
    const normalized = tag.toLowerCase().trim()
    // Filter out banned generic tags
    if (BANNED_TAGS.some((banned) => normalized === banned || normalized.includes(banned))) {
      return false
    }
    // Filter out tags that are too short or too long
    if (tag.length < 3 || tag.length > 50) {
      return false
    }
    return true
  })
}

const perplexity = new OpenAI({
  apiKey: PERPLEXITY_API_KEY,
  baseURL: 'https://api.perplexity.ai',
})

interface Top40Entry {
  id: number
  companyName: string
  contactPerson: string
  position?: string | null
  registrationNumber?: string | null
  notes?: string | null
  businessTags?: string | null
}

async function generateBusinessTags(company: Top40Entry): Promise<string[]> {
  const searchQuery = company.registrationNumber
    ? `"${company.companyName}" OR "${company.registrationNumber}" Latvia company`
    : `"${company.companyName}" Latvia company business services products`

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
      model: 'sonar-pro',
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

    // Extract JSON array from response (handle potential text around it)
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

async function generateTop40Tags() {
  // Parse command line args for --limit
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 1000

  console.log('🚀 Starting Top40 business tags generation...\n')
  if (limitArg) {
    console.log(`⚙️  Running with limit: ${limit}\n`)
  }

  const payload = await getPayload({ config })

  // Fetch Top40 entries
  const top40Entries = await payload.find({
    collection: 'top40',
    limit,
    depth: 0,
  })

  console.log(`📊 Found ${top40Entries.docs.length} Top40 entries\n`)

  let processed = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  for (const entry of top40Entries.docs as Top40Entry[]) {
    processed++
    console.log(`\n[${processed}/${top40Entries.docs.length}] Processing: ${entry.companyName}`)

    // Skip if already has tags
    if (entry.businessTags && entry.businessTags.trim().length > 0) {
      const tagCount = entry.businessTags.split(',').length
      console.log(`  ⏭️  Already has ${tagCount} tags, skipping...`)
      skipped++
      continue
    }

    // Generate tags using Perplexity
    const tags = await generateBusinessTags(entry)

    if (tags.length === 0) {
      console.log(`  ⚠️  No tags generated`)
      errors++
      continue
    }

    console.log(`  🏷️  Generated tags: ${tags.join(', ')}`)

    // Update the entry with new tags (comma separated)
    try {
      await payload.update({
        collection: 'top40',
        id: entry.id,
        data: {
          businessTags: tags.join(', '),
        },
        overrideAccess: true,
        context: {
          // Skip relationship validation for submittedBy field
          skipValidation: true,
        },
        // Create a fake request context that simulates superadmin
        req: {
          user: { id: 0, isSuperadmin: true },
          payload,
          headers: new Headers({ host: PRIMARY_SUPERADMIN_HOST }),
        } as any,
      })
      console.log(`  ✅ Updated successfully`)
      updated++
    } catch (error) {
      console.error(`  ❌ Error updating:`, error)
      errors++
    }

    // Rate limiting - wait 2 seconds between API calls (sonar-pro is slower)
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  console.log('\n' + '='.repeat(50))
  console.log('📈 Summary:')
  console.log(`   Total processed: ${processed}`)
  console.log(`   Successfully updated: ${updated}`)
  console.log(`   Skipped (already tagged): ${skipped}`)
  console.log(`   Errors: ${errors}`)
  console.log('='.repeat(50))
  console.log('\n✨ Top40 tags generation completed!')

  process.exit(0)
}

generateTop40Tags().catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})
