import { parseGuests, getGroupGuests, type ParsedGuest } from './parseGuests'

export interface SlideMember {
  id: string
  membershipId?: string | null
  name: string
  surname: string
  company: string
  jobPosition?: string | null
  email: string
  phone?: string | null
  website?: string | null
  country?: string | null
  tyfcbGiven?: number | null
  tyfcbReceived?: number | null
  activityGiven?: number | null
  activityReceived?: number | null
  profileImage?: { url?: string | null } | null
  logo?: { url?: string | null } | null
  slideImage?: { url?: string | null } | null
  slideBackgroundColor?: string | null
  slideImageMode?: 'contain' | 'cover' | null
  powerGroup?: { id: string; title: string } | string | null
  powerGroupLead?: boolean | null
  specialRequest?: string | null
  inaugurationDate?: string | null
  attendanceType?: 'onsite' | 'online' | null
}

export interface SlidePowerGroup {
  id: string
  title: string
  slug: string
  description?: string | null
}

export type SlideBlockData =
  | {
      blockType: 'logoWall'
      id?: string
      title?: string | null
      customSlideSeconds?: number | null
    }
  | {
      blockType: 'speechMaster'
      id?: string
      member: string | { id: string }
      customSlideSeconds?: number | null
    }
  | {
      blockType: 'speechMasterCeremony'
      id?: string
      title?: string | null
      member: string | { id: string }
      customSlideSeconds?: number | null
    }
  | {
      blockType: 'powerGroup'
      id?: string
      powerGroup: string | { id: string }
      disableTimer?: boolean | null
      customSlideSeconds?: number | null
    }
  | {
      blockType: 'guests'
      id?: string
      title?: string | null
      guestsText: string
      customSlideSeconds?: number | null
    }
  | {
      blockType: 'customImage'
      id?: string
      imageUrl: string
      displayMode: 'contain' | 'cover'
      backgroundColor: string
      customSlideSeconds?: number | null
    }

export interface SlideData {
  type:
    | 'intro'
    | 'group'
    | 'member'
    | 'guests'
    | 'guest-detail'
    | 'speech-master-ceremony'
    | 'custom-image'
  data: unknown
  duration: number
  disableTimer?: boolean
}

export interface BuildSlidesContext {
  members: SlideMember[]
  membersByGroup: Record<string, SlideMember[]>
  powerGroupsById: Record<string, SlidePowerGroup>
  membershipToUserId: Record<string, string>
  settings: {
    slideSeconds: number
    speechMasterMultiplier: number
    logoUrl: string | null
    chapterName: string
    businessGivenMin: number
    businessReceivedMin: number
  }
  skipFromSlidesIds: string[]
  attendanceFilter: 'all' | 'onsite' | 'online'
  enableAttendance: boolean
}

const GUESTS_PER_SLIDE = 18

function relId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  return value.id || null
}

function memberFromMembership(
  membershipId: string | null,
  ctx: BuildSlidesContext,
): SlideMember | null {
  if (!membershipId) return null
  const userId = ctx.membershipToUserId[membershipId]
  if (!userId) return null
  return ctx.members.find((m) => String(m.id) === String(userId)) || null
}

function filterByAttendance(member: SlideMember, filter: BuildSlidesContext['attendanceFilter']) {
  if (filter === 'all') return true
  return member.attendanceType === filter
}

function filterGuestByAttendance(
  guest: ParsedGuest,
  filter: BuildSlidesContext['attendanceFilter'],
) {
  if (filter === 'all') return true
  if (!guest.attendance) return true
  return guest.attendance === filter
}

function collectSpeechMasterUserIds(
  blocks: SlideBlockData[],
  ctx: BuildSlidesContext,
): Set<string> {
  const ids = new Set<string>()
  for (const block of blocks) {
    if (block.blockType === 'speechMaster') {
      const membershipId = relId(block.member)
      const userId = membershipId ? ctx.membershipToUserId[membershipId] : null
      if (userId) ids.add(String(userId))
    }
  }
  return ids
}

function buildLogoWallSlide(
  block: Extract<SlideBlockData, { blockType: 'logoWall' }>,
  blocks: SlideBlockData[],
  ctx: BuildSlidesContext,
): SlideData {
  const speechMasterIds = collectSpeechMasterUserIds(blocks, ctx)
  const powerGroupOrder = blocks
    .filter((b): b is Extract<SlideBlockData, { blockType: 'powerGroup' }> => b.blockType === 'powerGroup')
    .map((b) => relId(b.powerGroup))
    .filter((id): id is string => !!id)

  const ordered: SlideMember[] = []

  for (const userId of speechMasterIds) {
    const member = ctx.members.find((m) => String(m.id) === String(userId))
    if (member && filterByAttendance(member, ctx.attendanceFilter)) {
      ordered.push(member)
    }
  }

  for (const groupId of powerGroupOrder) {
    const groupMembers = (ctx.membersByGroup[groupId] || []).filter((m) =>
      filterByAttendance(m, ctx.attendanceFilter),
    )
    for (const member of groupMembers) {
      if (speechMasterIds.has(String(member.id))) continue
      ordered.push(member)
    }
  }

  return {
    type: 'intro',
    data: { members: ordered, title: block.title || null },
    duration: block.customSlideSeconds || ctx.settings.slideSeconds,
  }
}

function buildSpeechMasterSlide(
  block: Extract<SlideBlockData, { blockType: 'speechMaster' }>,
  ctx: BuildSlidesContext,
): SlideData | null {
  const membershipId = relId(block.member)
  const member = memberFromMembership(membershipId, ctx)
  if (!member) return null

  const duration =
    block.customSlideSeconds ||
    ctx.settings.slideSeconds * ctx.settings.speechMasterMultiplier

  return {
    type: 'member',
    data: { member, isSpeechMaster: true },
    duration,
  }
}

function buildSpeechMasterCeremonySlide(
  block: Extract<SlideBlockData, { blockType: 'speechMasterCeremony' }>,
  ctx: BuildSlidesContext,
): SlideData | null {
  const membershipId = relId(block.member)
  const member = memberFromMembership(membershipId, ctx)
  if (!member) return null

  return {
    type: 'speech-master-ceremony',
    data: { speechMaster: member, title: block.title || null },
    duration: block.customSlideSeconds || ctx.settings.slideSeconds,
  }
}

function buildPowerGroupSlides(
  block: Extract<SlideBlockData, { blockType: 'powerGroup' }>,
  speechMasterUserIds: Set<string>,
  ctx: BuildSlidesContext,
): SlideData[] {
  const groupId = relId(block.powerGroup)
  if (!groupId) return []

  const group = ctx.powerGroupsById[groupId]
  if (!group) return []

  const members = (ctx.membersByGroup[groupId] || []).filter((m) =>
    filterByAttendance(m, ctx.attendanceFilter),
  )
  if (members.length === 0) return []

  const duration = block.customSlideSeconds || ctx.settings.slideSeconds
  const disableTimer = block.disableTimer === true
  const groupMeta = {
    id: group.id,
    title: group.title,
    slug: group.slug,
    description: group.description ?? null,
    disableTimer,
    customSlideSeconds: block.customSlideSeconds ?? null,
  }

  const slides: SlideData[] = [
    {
      type: 'group',
      data: { group: groupMeta, members },
      duration,
      disableTimer,
    },
  ]

  for (const member of members) {
    if (speechMasterUserIds.has(String(member.id))) continue
    if (ctx.skipFromSlidesIds.includes(String(member.id))) continue
    slides.push({
      type: 'member',
      data: { member, isSpeechMaster: false, group: groupMeta },
      duration,
      disableTimer,
    })
  }

  return slides
}

function buildGuestsSlides(
  block: Extract<SlideBlockData, { blockType: 'guests' }>,
  ctx: BuildSlidesContext,
): SlideData[] {
  const parsed = parseGuests(block.guestsText)
  // A `guests` block represents one section. Combine the parsed `main` and any
  // `groups[]` produced by `##` markers (defensive — we don't expect `##`
  // inside a single block) into a single GuestGroup.
  const merged = {
    title: block.title || parsed.main.title,
    general: [...parsed.main.general, ...parsed.groups.flatMap((g) => g.general)],
    online: [...parsed.main.online, ...parsed.groups.flatMap((g) => g.online)],
    onsite: [...parsed.main.onsite, ...parsed.groups.flatMap((g) => g.onsite)],
  }

  const allGuests = getGroupGuests(merged, 'all')
  const filtered = allGuests.filter((g) => filterGuestByAttendance(g, ctx.attendanceFilter))
  if (filtered.length === 0) return []

  const duration = block.customSlideSeconds || ctx.settings.slideSeconds
  const slides: SlideData[] = []
  const totalPages = Math.ceil(filtered.length / GUESTS_PER_SLIDE)

  for (let page = 0; page < totalPages; page++) {
    const startIndex = page * GUESTS_PER_SLIDE
    const pageGuests = filtered.slice(startIndex, startIndex + GUESTS_PER_SLIDE)
    slides.push({
      type: 'guests',
      data: {
        guests: pageGuests,
        logoUrl: ctx.settings.logoUrl,
        chapterName: ctx.settings.chapterName,
        pageNumber: page + 1,
        totalPages,
        startIndex,
        title: merged.title,
      },
      duration,
    })
  }

  for (let i = 0; i < filtered.length; i++) {
    slides.push({
      type: 'guest-detail',
      data: {
        guest: filtered[i],
        guestNumber: i + 1,
        totalGuests: filtered.length,
        title: merged.title,
      },
      duration,
    })
  }

  return slides
}

function buildCustomImageSlide(
  block: Extract<SlideBlockData, { blockType: 'customImage' }>,
  ctx: BuildSlidesContext,
): SlideData | null {
  if (!block.imageUrl) return null
  return {
    type: 'custom-image',
    data: {
      imageUrl: block.imageUrl,
      displayMode: block.displayMode || 'contain',
      backgroundColor: block.backgroundColor || '#000000',
    },
    duration: block.customSlideSeconds || ctx.settings.slideSeconds,
  }
}

export function buildSlidesFromBlocks(
  blocks: SlideBlockData[] | null | undefined,
  ctx: BuildSlidesContext,
): SlideData[] {
  if (!blocks || blocks.length === 0) return []

  const speechMasterUserIds = collectSpeechMasterUserIds(blocks, ctx)
  const result: SlideData[] = []

  for (const block of blocks) {
    switch (block.blockType) {
      case 'logoWall': {
        result.push(buildLogoWallSlide(block, blocks, ctx))
        break
      }
      case 'speechMaster': {
        const slide = buildSpeechMasterSlide(block, ctx)
        if (slide) result.push(slide)
        break
      }
      case 'speechMasterCeremony': {
        const slide = buildSpeechMasterCeremonySlide(block, ctx)
        if (slide) result.push(slide)
        break
      }
      case 'powerGroup': {
        result.push(...buildPowerGroupSlides(block, speechMasterUserIds, ctx))
        break
      }
      case 'guests': {
        result.push(...buildGuestsSlides(block, ctx))
        break
      }
      case 'customImage': {
        const slide = buildCustomImageSlide(block, ctx)
        if (slide) result.push(slide)
        break
      }
    }
  }

  return result
}
