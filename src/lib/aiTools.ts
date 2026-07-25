/**
 * AI Tool Definitions & Execution
 *
 * OpenAI function-calling tools for the member assistant.
 * Instead of dumping all data into the system prompt,
 * the AI decides which tools to call based on the user's question.
 *
 * Tools:
 * - search_members: Search organisation members by name, company, role
 * - search_top40: Search Top40 entries by business tags, company name
 * - get_member_profile: Get full profile for a specific member
 * - get_chapter_stats: Get chapter statistics (cached 5min)
 */

import type { Payload } from 'payload'
import type OpenAI from 'openai'
import { stripHtml, getUserName, getUserId } from './aiContext'

// --- Tool Definitions (OpenAI function calling format) ---

export const AI_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_members',
      description:
        'Search organisation members by first name, last name, company name, role or company description. Returns a compact list of every matching member.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search word or phrase (for example "finance", "Jane", "Acme Ltd")',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_top40',
      description:
        'Search Top40 lists by business tag, company name, contact person or notes. A Top40 list holds the companies and contacts an individual member is looking to reach. Returns every matching entry, grouped by the member who submitted it.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Search word or phrase (for example "finance", "Acme", "insurance")',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_member_profile',
      description:
        'Return a full member profile: all contact details, company description, role in the organisation and so on. Use this when the user wants detail about one specific member.',
      parameters: {
        type: 'object',
        properties: {
          memberName: {
            type: 'string',
            description: "The member's first name, last name or company name",
          },
        },
        required: ['memberName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_chapter_stats',
      description:
        'Return organisation statistics: number of active members and total number of Top40 entries.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
]

// --- Stats Cache (5 min TTL) ---

interface CachedStats {
  data: string
  expiresAt: number
}

const statsCache = new Map<string, CachedStats>()
const STATS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Active cleanup every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of statsCache.entries()) {
    if (entry.expiresAt < now) statsCache.delete(key)
  }
}, 10 * 60 * 1000).unref()

// --- Tool Execution Functions ---

async function searchMembers(
  payload: Payload,
  siteId: string | number,
  query: string,
): Promise<string> {
  const result = await payload.find({
    collection: 'site-memberships',
    where: {
      and: [
        { site: { equals: siteId } },
        { status: { equals: 'active' } },
        {
          or: [
            { company: { contains: query } },
            { name: { contains: query } },
            { surname: { contains: query } },
            { jobPosition: { contains: query } },
            { companyDescription: { contains: query } },
          ],
        },
      ],
    },
    limit: 500,
    depth: 1,
  })

  if (result.docs.length === 0) {
    return `Nav atrasts neviens biedrs ar vaicājumu "${query}".`
  }

  const lines = result.docs.map((m: any) => {
    const name = m.name && m.surname ? `${m.name} ${m.surname}` : getUserName(m.user)
    const parts = [name]
    if (m.company) parts.push(m.company)
    if (m.jobPosition) parts.push(m.jobPosition)
    if (m.orgRole) parts.push(`Role: ${m.orgRole}`)
    return parts.join(' | ')
  })

  return `Atrasti ${result.docs.length} biedri:\n${lines.join('\n')}`
}

async function searchTop40(
  payload: Payload,
  siteId: string | number,
  query: string,
): Promise<string> {
  const result = await payload.find({
    collection: 'top40',
    where: {
      and: [
        { site: { equals: siteId } },
        {
          or: [
            { businessTags: { contains: query } },
            { companyName: { contains: query } },
            { contactPerson: { contains: query } },
            { notes: { contains: query } },
          ],
        },
      ],
    },
    limit: 1000,
    depth: 1,
  })

  if (result.docs.length === 0) {
    return `Nav atrasts neviens Top40 ieraksts ar vaicājumu "${query}".`
  }

  // Build userId → name map from results
  const userIdToName = new Map<string | number, string>()
  for (const entry of result.docs as any[]) {
    const submitterId = getUserId(entry.submittedBy)
    if (submitterId && !userIdToName.has(submitterId)) {
      userIdToName.set(submitterId, getUserName(entry.submittedBy))
    }
  }

  // Group by submitter
  const grouped = new Map<string, string[]>()
  for (const entry of result.docs as any[]) {
    const submitterId = getUserId(entry.submittedBy)
    const submitterName = submitterId
      ? userIdToName.get(submitterId) || 'Unknown'
      : 'Unknown'

    const parts: string[] = []
    if (entry.companyName) parts.push(entry.companyName)
    if (entry.contactPerson) parts.push(`kontakts: ${entry.contactPerson}`)
    if (entry.position) parts.push(`amats: ${entry.position}`)
    if (entry.businessTags) parts.push(`tagi: ${entry.businessTags}`)

    const line = parts.join(', ')

    if (!grouped.has(submitterName)) {
      grouped.set(submitterName, [])
    }
    grouped.get(submitterName)!.push(line)
  }

  const sections = Array.from(grouped.entries()).map(([name, entries]) => {
    const list = entries.map((e) => `  - ${e}`).join('\n')
    return `${name} (${entries.length} ieraksti):\n${list}`
  })

  return `Atrasti ${result.docs.length} Top40 ieraksti:\n\n${sections.join('\n\n')}`
}

async function getMemberProfile(
  payload: Payload,
  siteId: string | number,
  memberName: string,
): Promise<string> {
  const result = await payload.find({
    collection: 'site-memberships',
    where: {
      and: [
        { site: { equals: siteId } },
        { status: { equals: 'active' } },
        {
          or: [
            { name: { contains: memberName } },
            { surname: { contains: memberName } },
            { company: { contains: memberName } },
          ],
        },
      ],
    },
    limit: 1,
    depth: 1,
  })

  if (result.docs.length === 0) {
    return `Nav atrasts biedrs ar nosaukumu "${memberName}".`
  }

  const m = result.docs[0] as any
  const name = m.name && m.surname ? `${m.name} ${m.surname}` : getUserName(m.user)
  const parts: string[] = [`Vārds: ${name}`]

  if (m.company) parts.push(`Uzņēmums: ${m.company}`)
  if (m.jobPosition) parts.push(`Amats: ${m.jobPosition}`)
  if (m.orgRole) parts.push(`Role in organisation: ${m.orgRole}`)
  if (m.phone) parts.push(`Tālrunis: ${m.phone}`)
  if (m.companyPhone && m.companyPhone !== m.phone)
    parts.push(`Uzņēmuma tālrunis: ${m.companyPhone}`)
  if (m.companyEmail) parts.push(`E-pasts: ${m.companyEmail}`)
  if (m.website) parts.push(`Mājaslapa: ${m.website}`)

  const desc = stripHtml(m.description)
  if (desc) parts.push(`Par sevi: ${desc}`)

  const compDesc = stripHtml(m.companyDescription)
  if (compDesc) parts.push(`Par uzņēmumu: ${compDesc}`)

  return parts.join('\n')
}

async function getChapterStats(
  payload: Payload,
  siteId: string | number,
): Promise<string> {
  const cacheKey = String(siteId)
  const cached = statsCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const [membersResult, top40Result] = await Promise.all([
    payload.find({
      collection: 'site-memberships',
      where: {
        and: [{ site: { equals: siteId } }, { status: { equals: 'active' } }],
      },
      limit: 0,
    }),
    payload.find({
      collection: 'top40',
      where: { site: { equals: siteId } },
      limit: 0,
    }),
  ])

  const data = [
    `Aktīvo biedru skaits: ${membersResult.totalDocs}`,
    `Top40 ierakstu skaits: ${top40Result.totalDocs}`,
  ].join('\n')

  statsCache.set(cacheKey, { data, expiresAt: Date.now() + STATS_CACHE_TTL })

  return data
}

// --- Dispatcher ---

export async function executeToolCall(
  toolName: string,
  args: Record<string, any>,
  payload: Payload,
  siteId: string | number,
): Promise<string> {
  switch (toolName) {
    case 'search_members':
      return searchMembers(payload, siteId, args.query || '')
    case 'search_top40':
      return searchTop40(payload, siteId, args.query || '')
    case 'get_member_profile':
      return getMemberProfile(payload, siteId, args.memberName || '')
    case 'get_chapter_stats':
      return getChapterStats(payload, siteId)
    default:
      return `Nezināms rīks: ${toolName}`
  }
}
