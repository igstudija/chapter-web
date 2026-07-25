/**
 * Build the new `slides` blocks array from legacy slideshow fields
 * (`powerGroupOrder`, `speechMaster`, `guestsText`).
 *
 * Used both by the `beforeChange` hook (to auto-populate `slides` when empty)
 * and by the data migration script. Pure function — no side effects.
 */

interface LegacyPowerGroupOrderItem {
  powerGroup?: number | string | { id: number | string } | null
  disableTimer?: boolean | null
  customSlideSeconds?: number | null
}

interface LegacyData {
  powerGroupOrder?: LegacyPowerGroupOrderItem[] | null
  speechMaster?: number | string | { id: number | string } | null
  guestsText?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SlideBlock = Record<string, any>

function relId(value: number | string | { id: number | string } | null | undefined): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && value.id !== undefined) return String(value.id)
  return null
}

function splitGuestsBySections(text: string): Array<{ title: string; text: string }> {
  if (!text || !text.trim()) return []

  const sections: Array<{ title: string; text: string }> = []
  let currentTitle = ''
  let currentLines: string[] = []

  for (const line of text.split('\n')) {
    const headerMatch = line.match(/^##\s*(.+)$/)
    if (headerMatch) {
      if (currentLines.some((l) => l.trim())) {
        sections.push({ title: currentTitle, text: currentLines.join('\n').trim() })
      }
      currentTitle = headerMatch[1].trim()
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }

  if (currentLines.some((l) => l.trim())) {
    sections.push({ title: currentTitle, text: currentLines.join('\n').trim() })
  }

  return sections
}

export function buildSlidesFromLegacy(legacy: LegacyData): SlideBlock[] {
  const slides: SlideBlock[] = []

  // 1. Logo wall (always first — preserves existing intro slide behaviour)
  slides.push({ blockType: 'logoWall' })

  // 2. Speech master member slide
  const speechMasterId = relId(legacy.speechMaster ?? null)
  if (speechMasterId) {
    slides.push({
      blockType: 'speechMaster',
      member: speechMasterId,
    })
  }

  // 3. Power group blocks in original order
  if (Array.isArray(legacy.powerGroupOrder)) {
    for (const item of legacy.powerGroupOrder) {
      const groupId = relId(item.powerGroup ?? null)
      if (!groupId) continue
      slides.push({
        blockType: 'powerGroup',
        powerGroup: groupId,
        disableTimer: item.disableTimer === true,
        customSlideSeconds: item.customSlideSeconds ?? null,
      })
    }
  }

  // 4. Guests blocks — one per `##` section, plus leading default-titled
  //    block for any text before the first `##`
  const sections = splitGuestsBySections(legacy.guestsText || '')
  for (const section of sections) {
    slides.push({
      blockType: 'guests',
      title: section.title || null,
      guestsText: section.text,
    })
  }

  // 5. Speech master ceremony at the end
  if (speechMasterId) {
    slides.push({
      blockType: 'speechMasterCeremony',
      member: speechMasterId,
    })
  }

  return slides
}
