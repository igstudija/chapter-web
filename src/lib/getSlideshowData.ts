import type { Payload, Where } from 'payload'
import type {
  BuildSlidesContext,
  MemberSlideTemplate,
  SlideBlockData,
  SlideMediaType,
  SlideMember,
  SlidePowerGroup,
} from './buildSlides'
import { DEFAULT_ORG_NAME } from './branding'

interface SiteForSlides {
  id: number | string
  name?: string | null
  enableAttendance?: boolean | null
  locale?: string | null
}

export interface SlideshowDataResult {
  slideBlocks: SlideBlockData[]
  buildContext: Omit<BuildSlidesContext, 'attendanceFilter'>
  transitionSoundUrl: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function relId(value: any): string | null {
  if (!value) return null
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && value.id) return String(value.id)
  return null
}

/**
 * Fetch all data needed by the slideshow for a given site and assemble it
 * into the shape consumed by `<SlideshowViewer>`. Used by both
 * `/api/slides/data` (full slideshow) and `/api/slides/preview/[memberId]`
 * (member-presentation preview), so behavior stays in one place.
 */
export async function getSlideshowData(
  payload: Payload,
  site: SiteForSlides,
): Promise<SlideshowDataResult | null> {
  const membershipsWhere: Where = {
    and: [
      { status: { equals: 'active' } },
      { role: { in: ['member', 'member-admin'] } },
    ],
  }

  // Fetch settings, power groups, memberships, special requests, and site
  // settings in parallel — they're all independent queries against the same site.
  const [
    settingsResult,
    allPowerGroups,
    memberships,
    specialRequests,
    siteSettingsResult,
  ] = await Promise.all([
    payload.find({
      collection: 'slideshow-settings-collection',
      where: {},
      limit: 1,
      depth: 2,
    }),
    payload.find({
      collection: 'power-groups',
      where: {},
      limit: 100,
    }),
    payload.find({
      collection: 'members',
      where: membershipsWhere,
      // depth: 1 populates user/powerGroup/profileImage/logo/slideImage in
      // one query plan (avoiding N+1 findByID per membership).
      depth: 1,
      limit: 200,
    }),
    payload.find({
      collection: 'special-requests',
      where: {},
      limit: 500,
      sort: ['sortOrder', '-createdAt'],
    }),
    payload.find({
      collection: 'settings',
      where: {},
      limit: 1,
      depth: 1,
    }),
  ])

  if (settingsResult.docs.length === 0) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = settingsResult.docs[0] as any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asObj = (v: unknown): any | null =>
    v !== null && v !== undefined && typeof v === 'object' ? v : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mediaToUrl = (m: any): { url: string } | null =>
    m?.url ? { url: m.url as string } : null

  const populatedMemberships = memberships.docs.map((membership) => {
    const user = asObj(membership.user)
    const powerGroup = asObj(membership.powerGroup)
    const profileImage = asObj(membership.profileImage)
    const logo = asObj(membership.logo)
    const slideImage = asObj(membership.slideImage)
    // `slideImages` supersedes the single `slideImage`; older members who never
    // opened the new editor still have only the legacy field populated.
    const slideImages = (Array.isArray(membership.slideImages) ? membership.slideImages : [])
      .map((entry: unknown) => mediaToUrl(asObj(entry)))
      .filter((entry): entry is { url: string } => entry !== null)
    const resolvedSlideImages = slideImages.length > 0
      ? slideImages
      : [mediaToUrl(slideImage)].filter((entry): entry is { url: string } => entry !== null)

    return {
      membershipId: String(membership.id),
      id: user?.id ? String(user.id) : '',
      name: user?.name || '',
      surname: user?.surname || '',
      email: user?.email || '',
      company: membership.company || '',
      jobPosition: membership.jobPosition || null,
      phone: membership.phone || null,
      website: membership.website || null,
      country: membership.country || null,
      tyfcbGiven: membership.tyfcbGiven || 0,
      tyfcbReceived: membership.tyfcbReceived || 0,
      attendanceType: (membership.attendanceType || 'onsite') as 'onsite' | 'online',
      profileImage: mediaToUrl(profileImage),
      logo: mediaToUrl(logo),
      slideImage: mediaToUrl(slideImage),
      slideImages: resolvedSlideImages,
      slideMediaType: (membership.slideMediaType || 'image') as SlideMediaType,
      slideVideoUrl: membership.slideVideoUrl || null,
      slideTemplate: (membership.slideTemplate || 'classic') as MemberSlideTemplate,
      slideBackgroundColor: membership.slideBackgroundColor || null,
      slideBackgroundColorRight: membership.slideBackgroundColorRight || null,
      slideImageMode: (membership.slideImageMode || null) as 'contain' | 'cover' | null,
      slideSpecialRequestDisplay: membership.slideSpecialRequestDisplay || 'inherit',
      slideNextSpeakerPosition: membership.slideNextSpeakerPosition || 'inherit',
      powerGroup: powerGroup
        ? { id: String(powerGroup.id), title: powerGroup.title as string }
        : null,
      powerGroupLead: membership.powerGroupLead || false,
      inaugurationDate: membership.inaugurationDate || null,
    }
  })

  // Pick the request each member features on the slide (showOnSlide). If none is
  // flagged, fall back to the first one in their custom order. Docs are already
  // sorted by sortOrder, so the first match per user is the top of their list.
  const slideRequestByUser: Record<string, string> = {}
  const firstRequestByUser: Record<string, string> = {}
  for (const req of specialRequests.docs) {
    const userId = typeof req.requestedBy === 'object' ? req.requestedBy?.id : req.requestedBy
    if (!userId || !req.request) continue
    const key = String(userId)
    if (!firstRequestByUser[key]) firstRequestByUser[key] = req.request
    if (req.showOnSlide && !slideRequestByUser[key]) slideRequestByUser[key] = req.request
  }
  const specialRequestsByUser: Record<string, string> = {}
  for (const key of new Set([
    ...Object.keys(firstRequestByUser),
    ...Object.keys(slideRequestByUser),
  ])) {
    specialRequestsByUser[key] = slideRequestByUser[key] || firstRequestByUser[key]
  }

  const members: SlideMember[] = populatedMemberships.map((m) => ({
    ...m,
    specialRequest: specialRequestsByUser[String(m.id)] || null,
  }))

  const membershipToUserId: Record<string, string> = {}
  for (const m of populatedMemberships) {
    if (m.membershipId && m.id) {
      membershipToUserId[m.membershipId] = String(m.id)
    }
  }

  const membersByGroup: Record<string, SlideMember[]> = {}
  for (const m of members) {
    const groupId =
      m.powerGroup && typeof m.powerGroup === 'object' ? m.powerGroup.id : m.powerGroup
    if (groupId) {
      const key = String(groupId)
      if (!membersByGroup[key]) membersByGroup[key] = []
      membersByGroup[key].push(m)
    }
  }

  for (const groupId of Object.keys(membersByGroup)) {
    membersByGroup[groupId].sort((a, b) => {
      if (a.powerGroupLead && !b.powerGroupLead) return -1
      if (!a.powerGroupLead && b.powerGroupLead) return 1
      const dateA = a.inaugurationDate ? new Date(a.inaugurationDate).getTime() : 0
      const dateB = b.inaugurationDate ? new Date(b.inaugurationDate).getTime() : 0
      return dateA - dateB
    })
  }

  const powerGroupsById: Record<string, SlidePowerGroup> = {}
  for (const g of allPowerGroups.docs) {
    powerGroupsById[String(g.id)] = {
      id: String(g.id),
      title: g.title,
      slug: g.slug,
      description: g.description || null,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const siteSettings = (siteSettingsResult.docs[0] as any) || null

  const skipFromSlidesIds: string[] = []
  if (Array.isArray(settings.skipMembers)) {
    for (const membership of settings.skipMembers) {
      if (membership && typeof membership === 'object' && 'id' in membership) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const membershipObj = membership as any
        const userId =
          typeof membershipObj.user === 'object' ? membershipObj.user?.id : membershipObj.user
        if (userId) {
          skipFromSlidesIds.push(String(userId))
        }
      } else if (typeof membership === 'string') {
        try {
          const membershipDoc = await payload.findByID({
            collection: 'members',
            id: membership,
            depth: 1,
          })
          const userId =
            typeof membershipDoc.user === 'object' ? membershipDoc.user?.id : membershipDoc.user
          if (userId) {
            skipFromSlidesIds.push(String(userId))
          }
        } catch {
          // ignore
        }
      }
    }
  }

  let transitionSoundUrl: string | null = null
  if (settings.transitionSound) {
    const soundId = relId(settings.transitionSound)
    if (soundId) {
      try {
        const soundMedia = await payload.findByID({
          collection: 'media',
          id: soundId,
          depth: 0,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transitionSoundUrl = (soundMedia as any)?.url || null
      } catch {
        // ignore
      }
    }
  }

  // Resolve slide blocks: stringify relationship IDs, materialize customImage URLs.
  const rawBlocks: unknown[] = Array.isArray(settings.slides) ? settings.slides : []
  const slideBlocks: SlideBlockData[] = []
  for (const raw of rawBlocks) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const block = raw as any
    switch (block.blockType) {
      case 'logoWall':
        slideBlocks.push({
          blockType: 'logoWall',
          id: block.id,
          title: block.title || null,
          customSlideSeconds: block.customSlideSeconds ?? null,
        })
        break
      case 'speechMaster': {
        const memberId = relId(block.member)
        if (memberId) {
          slideBlocks.push({
            blockType: 'speechMaster',
            id: block.id,
            member: memberId,
            customSlideSeconds: block.customSlideSeconds ?? null,
            hideMemberInfo: block.hideMemberInfo === true,
          })
        }
        break
      }
      case 'speechMasterCeremony': {
        const memberId = relId(block.member)
        if (memberId) {
          slideBlocks.push({
            blockType: 'speechMasterCeremony',
            id: block.id,
            title: block.title ?? null,
            member: memberId,
            customSlideSeconds: block.customSlideSeconds ?? null,
          })
        }
        break
      }
      case 'powerGroup': {
        const groupId = relId(block.powerGroup)
        if (groupId) {
          slideBlocks.push({
            blockType: 'powerGroup',
            id: block.id,
            powerGroup: groupId,
            disableTimer: block.disableTimer === true,
            customSlideSeconds: block.customSlideSeconds ?? null,
            hideMemberInfo: block.hideMemberInfo === true,
          })
        }
        break
      }
      case 'guests':
        if (block.guestsText) {
          slideBlocks.push({
            blockType: 'guests',
            id: block.id,
            title: block.title || null,
            guestsText: block.guestsText,
            customSlideSeconds: block.customSlideSeconds ?? null,
          })
        }
        break
      case 'customImage': {
        let imageUrl: string | null = null
        if (block.image) {
          if (typeof block.image === 'object' && block.image.url) {
            imageUrl = block.image.url
          } else {
            const imageId = relId(block.image)
            if (imageId) {
              try {
                const media = await payload.findByID({
                  collection: 'media',
                  id: imageId,
                  depth: 0,
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                imageUrl = (media as any)?.url || null
              } catch {
                // ignore
              }
            }
          }
        }
        if (imageUrl) {
          slideBlocks.push({
            blockType: 'customImage',
            id: block.id,
            imageUrl,
            displayMode: block.displayMode || 'contain',
            backgroundColor: block.backgroundColor || '#000000',
            customSlideSeconds: block.customSlideSeconds ?? null,
          })
        }
        break
      }
    }
  }

  return {
    slideBlocks,
    buildContext: {
      members,
      membersByGroup,
      powerGroupsById,
      membershipToUserId,
      settings: {
        slideSeconds: settings.slideSeconds || 60,
        speechMasterMultiplier: settings.speechMasterMultiplier || 2,
        businessGivenMin: settings.businessGivenMin || 0,
        businessReceivedMin: settings.businessReceivedMin || 0,
        slideImageSeconds: settings.slideImageSeconds || 30,
        slideChrome: settings.slideChrome === 'minimal' ? 'minimal' : 'bar',
        nextSpeakerPosition: settings.nextSpeakerPosition === 'bottom' ? 'bottom' : 'top',
        specialRequestDisplay: (['bar', 'slide', 'flash', 'off'] as const).includes(
          settings.specialRequestDisplay,
        )
          ? settings.specialRequestDisplay
          : 'bar',
        logoUrl:
          siteSettings?.siteLogo && typeof siteSettings.siteLogo === 'object'
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ((siteSettings.siteLogo as any).url as string | null)
            : null,
        chapterName: site.name || DEFAULT_ORG_NAME,
      },
      skipFromSlidesIds,
      enableAttendance: site.enableAttendance || false,
    },
    transitionSoundUrl,
  }
}
