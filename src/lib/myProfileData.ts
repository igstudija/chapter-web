/**
 * My Profile Data Utilities
 *
 * Centralized data fetching for all my-profile pages.
 * Eliminates code duplication across profile sub-pages.
 */

import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import slugify from 'slugify'
import config from '@/payload.config'
import { getCurrentSite } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import type { User, SiteMembership, Site } from '@/payload-types'

// User with JWT context fields - extends User without redefining fields that already exist
export interface UserWithContext extends User {
  // Additional fields not in base User type
  siteEnableActivities?: boolean
}

// Profile image/logo type
export interface MediaImage {
  url: string
  alt?: string | null
}

// Base profile data returned by getMyProfileBaseData
export interface MyProfileBaseData {
  user: User
  userWithContext: UserWithContext
  membership: SiteMembership | null
  currentSite: Site
  locale: Locale
  t: ReturnType<typeof getTranslations>
  payload: Awaited<ReturnType<typeof getPayload>>
  // Pre-transformed media
  profileImage: MediaImage | null
  logo: MediaImage | null
  // Pre-built member object for MemberProfileHeader
  memberForHeader: {
    name: string
    surname: string
    company: string
    jobPosition?: string | null
    companyEmail: string
    phone: string
    companyPhone: string
    website: string
  }
  // Preview link for profile
  previewLink: string
}

// Tab counts data
export interface ProfileTabCounts {
  specialRequestsCount: number
  top40Count: number
  top20Count: number
  successStoriesCount: number
}

/**
 * Get base profile data required by all my-profile pages
 * Handles auth, membership lookup, and common data transformation
 */
export async function getMyProfileBaseData(): Promise<MyProfileBaseData> {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect('/login')
  }

  const currentSite = await getCurrentSite()
  if (!currentSite) {
    redirect('/login')
  }

  const userWithContext = user as UserWithContext
  const locale = (currentSite.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  // Get user's membership for the current site (from host header)
  // Important: Always use currentSite.id from host, not JWT's currentSiteId
  // This handles the case when user has multiple sites open in same browser
  let membership: SiteMembership | null = null

  // Check if JWT context matches current site
  const jwtMatchesCurrentSite = userWithContext.currentSiteId !== null &&
    userWithContext.currentSiteId !== undefined &&
    String(userWithContext.currentSiteId) === String(currentSite.id)

  if (jwtMatchesCurrentSite && userWithContext.currentMembershipId) {
    // JWT context matches current site - use cached membership ID
    membership = await payload.findByID({
      collection: 'site-memberships',
      id: userWithContext.currentMembershipId,
      depth: 1,
    })
  }

  // If no membership yet (JWT mismatch or no cached ID), find it by user + site
  if (!membership) {
    const memberships = await payload.find({
      collection: 'site-memberships',
      where: {
        and: [{ user: { equals: user.id } }, { site: { equals: currentSite.id } }],
      },
      limit: 1,
      depth: 1,
    })
    membership = memberships.docs[0] || null
  }

  // Check active status
  const isActive = userWithContext.isSuperadmin || membership?.status === 'active'
  if (!isActive) {
    redirect('/login')
  }

  // Transform media objects
  const profileImage = extractMediaImage(membership?.profileImage)
  const logo = extractMediaImage(membership?.logo)

  // Build member object for header
  const memberForHeader = {
    name: user.name || '',
    surname: user.surname || '',
    company: membership?.company || '',
    jobPosition: membership?.jobPosition || null,
    companyEmail: membership?.companyEmail || '',
    phone: membership?.phone || '',
    companyPhone: membership?.companyPhone || '',
    website: membership?.website || '',
    loginEmail: user.email,
  }

  // Generate preview link using slug (name-surname format)
  const slug = generateMemberSlug(user.name || '', user.surname || '')
  const previewLink = `/members/${slug}`

  return {
    user,
    userWithContext,
    membership,
    currentSite,
    locale,
    t,
    payload,
    profileImage,
    logo,
    memberForHeader,
    previewLink,
  }
}

/**
 * Fetch tab counts for ProfileTabs component
 * Called separately to allow parallel fetching with page-specific data
 */
export async function getProfileTabCounts(
  payload: Awaited<ReturnType<typeof getPayload>>,
  userId: string | number,
  siteId: string | number,
): Promise<ProfileTabCounts> {
  const [specialRequestsData, top40Data, top20Data, successStoriesData] = await Promise.all([
    payload.find({
      collection: 'special-requests',
      where: {
        and: [{ requestedBy: { equals: userId } }, { site: { equals: siteId } }],
      },
      limit: 0, // Only need count
    }),
    payload.find({
      collection: 'top40',
      where: {
        and: [{ submittedBy: { equals: userId } }, { site: { equals: siteId } }],
      },
      limit: 0,
    }),
    payload.find({
      collection: 'top20',
      where: {
        and: [{ submittedBy: { equals: userId } }, { site: { equals: siteId } }],
      },
      limit: 0,
    }),
    payload.find({
      collection: 'success-stories',
      where: {
        and: [{ author: { equals: userId } }, { site: { equals: siteId } }],
      },
      limit: 0,
    }),
  ])

  return {
    specialRequestsCount: specialRequestsData.totalDocs,
    top40Count: top40Data.totalDocs,
    top20Count: top20Data.totalDocs,
    successStoriesCount: successStoriesData.totalDocs,
  }
}

/**
 * Get site members list (for dropdowns, autocomplete)
 * Excludes the current user
 */
export async function getSiteMembers(
  payload: Awaited<ReturnType<typeof getPayload>>,
  siteId: string | number,
  excludeUserId: string | number,
): Promise<Array<{ id: string | number; name: string; surname: string }>> {
  const membershipsData = await payload.find({
    collection: 'site-memberships',
    where: {
      site: { equals: siteId },
      status: { equals: 'active' },
    },
    limit: 200,
    depth: 1,
  })

  return membershipsData.docs
    .filter((m) => {
      const memberUser = m.user && typeof m.user === 'object' ? m.user : null
      return memberUser && String(memberUser.id) !== String(excludeUserId)
    })
    .map((m) => {
      const memberUser = m.user && typeof m.user === 'object' ? m.user : null
      return {
        id: memberUser?.id ?? (typeof m.user === 'number' ? m.user : ''),
        name: memberUser?.name || '',
        surname: memberUser?.surname || '',
      }
    })
}

/**
 * Extract media image from Payload media field
 */
export function extractMediaImage(
  media: SiteMembership['profileImage'] | SiteMembership['logo'] | undefined | null,
): MediaImage | null {
  if (!media || typeof media !== 'object' || !media.url) {
    return null
  }
  return { url: media.url, alt: media.alt }
}

/**
 * Generate member slug from name
 * Uses slugify library to match the format used in members/[slug] page
 */
export function generateMemberSlug(name: string, surname: string): string {
  return slugify(`${name}-${surname}`, { lower: true, strict: true })
}
