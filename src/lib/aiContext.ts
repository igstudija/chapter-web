/**
 * AI Context Utilities
 *
 * Shared helpers used by aiTools.ts and superadmin AI context preview.
 *
 * - stripHtml, getUserName, getUserId — utility functions
 * - buildSystemPrompt — creates system prompt with chapter name (no data dump)
 * - buildAiContext / buildSystemPromptWithContext — legacy, used by superadmin preview only
 */

import type { Payload } from 'payload'

interface AiContextData {
  members: string
  top40: string
  siteName: string
}

/** Strip HTML tags from rich text fields */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

/** Get user full name from a populated relationship */
export function getUserName(user: any): string {
  if (!user || typeof user !== 'object') return 'Nezināms'
  return `${user.name || ''} ${user.surname || ''}`.trim() || 'Nezināms'
}

/** Get user ID from a populated or raw relationship */
export function getUserId(user: any): string | number | null {
  if (!user) return null
  if (typeof user === 'object') return user.id
  return user
}

/**
 * Build system prompt for tool-calling mode.
 * Only includes the base prompt + chapter name — no data dump.
 */
export function buildSystemPrompt(basePrompt: string, siteName: string): string {
  return `${basePrompt}

---

Tu strādā ar nodaļu: ${siteName}

Svarīgi par rīku lietošanu:
- Ja iepriekšējos rīku rezultātos vai sarunu vēsturē jau ir vajadzīgā informācija, izmanto to — neveic jaunu meklēšanu.
- Jaunu meklēšanu veic tikai tad, ja lietotājs prasa datus, kuri vēl nav iegūti.
- Follow-up jautājumos (filtrēšana, precizēšana, salīdzināšana) strādā ar jau esošajiem datiem.`
}

// --- Legacy functions for superadmin AI context preview ---

export async function buildAiContext(
  payload: Payload,
  siteId: string | number,
  siteName: string,
): Promise<AiContextData> {
  const [membershipsResult, top40Result] = await Promise.all([
    payload.find({
      collection: 'site-memberships',
      where: {
        site: { equals: siteId },
        status: { equals: 'active' },
      },
      limit: 200,
      depth: 1,
    }),
    payload.find({
      collection: 'top40',
      where: {
        site: { equals: siteId },
      },
      limit: 1000,
      depth: 1,
    }),
  ])

  const userIdToName = new Map<string | number, string>()
  for (const m of membershipsResult.docs as any[]) {
    const userId = getUserId(m.user)
    if (userId) {
      userIdToName.set(
        userId,
        m.name && m.surname ? `${m.name} ${m.surname}` : getUserName(m.user),
      )
    }
  }

  const members =
    membershipsResult.docs
      .map((m: any) => {
        const name = m.name && m.surname ? `${m.name} ${m.surname}` : getUserName(m.user)
        const parts: string[] = [`### ${name}`]

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
      })
      .join('\n\n') || 'Nav aktīvu biedru.'

  const top40ByUser = new Map<string, string[]>()
  for (const entry of top40Result.docs as any[]) {
    const submitterId = getUserId(entry.submittedBy)
    const submitterName = submitterId
      ? userIdToName.get(submitterId) || getUserName(entry.submittedBy)
      : 'Nezināms'

    const entryParts: string[] = []
    if (entry.companyName) entryParts.push(entry.companyName)
    if (entry.contactPerson) entryParts.push(`kontaktpersona: ${entry.contactPerson}`)
    if (entry.position) entryParts.push(`amats: ${entry.position}`)
    if (entry.notes) entryParts.push(`piezīmes: ${entry.notes}`)

    const entryStr = entryParts.join(', ')

    if (!top40ByUser.has(submitterName)) {
      top40ByUser.set(submitterName, [])
    }
    top40ByUser.get(submitterName)!.push(entryStr)
  }

  const top40 =
    Array.from(top40ByUser.entries())
      .map(([name, entries]) => {
        const entriesList = entries.map((e) => `  - ${e}`).join('\n')
        return `### ${name} (${entries.length} ieraksti)\n${entriesList}`
      })
      .join('\n\n') || 'Nav Top40 datu.'

  return {
    members,
    top40,
    siteName,
  }
}

/**
 * Legacy: Build full system prompt with all data injected.
 * Used by superadmin preview only.
 */
export function buildSystemPromptWithContext(
  basePrompt: string,
  context: AiContextData,
): string {
  return `${basePrompt}

---

# Nodaļas dati: ${context.siteName}

## Biedri (profili un kontakti)
${context.members}

## Top40 saraksti (kādus uzņēmumus/kontaktus katrs biedrs meklē)
${context.top40}`
}
