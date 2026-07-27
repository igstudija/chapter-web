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
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { isUserAdmin } from '@/lib/userHelpers'
import type { User, Member, Setting } from '@/payload-types'

// User with JWT context fields - extends User without redefining fields that already exist
export type UserWithContext = User

// Profile image/logo type
export interface MediaImage {
  url: string
  alt?: string | null
}

// Base profile data returned by getMyProfileBaseData
export interface MyProfileBaseData {
  user: User
  userWithContext: UserWithContext
  membership: Member | null
  settings: Setting
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

  const settings = await getSettings()
  if (!settings) {
    redirect('/login')
  }

  const userWithContext = user as UserWithContext
  const locale = (settings.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  // One member profile per user, looked up directly.
  //
  // This used to compare the site cached in the JWT against the site the host
  // resolved to, use the cached membership id when they agreed, and fall back
  // to a query when they did not — machinery for a person who could be a member
  // of several organisations and have two of them open in one browser.
  const memberships = await payload.find({
    collection: 'members',
    where: { user: { equals: user.id } },
    limit: 1,
    depth: 1,
  })
  const membership: Member | null = memberships.docs[0] || null

  if (!isUserAdmin(userWithContext) && membership?.status !== 'active') {
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
    settings,
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
  // `count` rather than `find({ limit: 0 })`: the latter is not "fetch nothing",
  // it is "fetch every matching row with no limit" — and then populates two
  // levels of relations on each one — to produce a single number. These four
  // run on every profile page render.
  const [specialRequestsData, top40Data, top20Data, successStoriesData] = await Promise.all([
    payload.count({
      collection: 'special-requests',
      where: { requestedBy: { equals: userId } },
    }),
    payload.count({
      collection: 'top40',
      where: { submittedBy: { equals: userId } },
    }),
    payload.count({
      collection: 'top20',
      where: { submittedBy: { equals: userId } },
    }),
    payload.count({
      collection: 'success-stories',
      where: { author: { equals: userId } },
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
    collection: 'members',
    where: {
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
  media: Member['profileImage'] | Member['logo'] | undefined | null,
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
