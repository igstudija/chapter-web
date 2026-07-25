export interface ParsedGuest {
  name: string
  company?: string
  description?: string
  attendance?: 'onsite' | 'online'
}

export interface GuestGroup {
  title: string
  general: ParsedGuest[]
  online: ParsedGuest[]
  onsite: ParsedGuest[]
}

export interface ParsedGuests {
  /** Main guests (before any ## header) */
  main: GuestGroup
  /** Additional slide groups created by ## headers */
  groups: GuestGroup[]
}

/**
 * Parse guests textarea into structured data.
 *
 * Format:
 *   Name, Company, Description
 *
 * Section headers:
 *   #Online        — marks following guests as online
 *   #Onsite        — marks following guests as onsite
 *   ##Anything     — creates a new slide with "Anything" as title
 *
 * ## sections inherit the current #Online/#Onsite attendance filter.
 *
 * Example:
 *   #Online
 *   Guest A, Company A
 *   #Onsite
 *   Guest B, Company B
 *   ##Aizvietotāji
 *   Sub B, Company SB
 *   ##Topošie biedri
 *   New A, Company NA
 */
export function parseGuests(text: string | null | undefined): ParsedGuests {
  const result: ParsedGuests = {
    main: { title: 'Viesi', general: [], online: [], onsite: [] },
    groups: [],
  }

  if (!text?.trim()) return result

  let currentGroup: GuestGroup = result.main
  let parentGroup: 'general' | 'online' | 'onsite' = 'general'

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    // Check for section headers
    const headerMatch = line.match(/^(#{1,2})\s*(.+)$/)
    if (headerMatch) {
      const level = headerMatch[1].length
      const label = headerMatch[2].trim()

      if (level === 2) {
        // ## creates a new slide group
        const newGroup: GuestGroup = { title: label, general: [], online: [], onsite: [] }
        result.groups.push(newGroup)
        currentGroup = newGroup
      } else if (level === 1) {
        const labelLower = label.toLowerCase()
        if (labelLower === 'online') {
          parentGroup = 'online'
        } else if (labelLower === 'onsite') {
          parentGroup = 'onsite'
        }
        // Switch back to main group when a new # header appears
        currentGroup = result.main
      }
      continue
    }

    // Parse guest line: Name, Company, Description
    const parts = line.split(',').map((p) => p.trim())
    const name = parts[0]
    if (!name) continue

    const guest: ParsedGuest = {
      name,
      company: parts[1] || undefined,
      description: parts[2] || undefined,
      attendance:
        parentGroup === 'online' ? 'online' : parentGroup === 'onsite' ? 'onsite' : undefined,
    }

    if (parentGroup === 'online') currentGroup.online.push(guest)
    else if (parentGroup === 'onsite') currentGroup.onsite.push(guest)
    else currentGroup.general.push(guest)
  }

  return result
}

/**
 * Get guests from a group filtered by attendance.
 */
export function getGroupGuests(
  group: GuestGroup,
  filter: 'all' | 'online' | 'onsite' = 'all',
): ParsedGuest[] {
  if (filter === 'online') {
    return [...group.online, ...group.general]
  }
  if (filter === 'onsite') {
    return [...group.onsite, ...group.general]
  }
  return [...group.general, ...group.online, ...group.onsite]
}
