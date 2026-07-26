'use client'

import Link from 'next/link'
import { Building2, Globe, Mail, Phone, Users, FileText } from 'lucide-react'
import { getThumbnailUrl } from '@/lib/getThumbnailUrl'

interface MemberCardProps {
  id: string
  name: string
  surname: string
  company: string
  jobPosition?: string
  description?: string
  logo?: {
    url: string
    alt: string
  }
  profileImage?: {
    url: string
    alt?: string
  }
  phone?: string
  email?: string
  website?: string
  orgRole?: string
  companyEmail?: string
  companyPhone?: string
  specialRequestsCount?: number
  top40Count?: number
}

/**
 * Badge colours still carry the same three states they always did — the
 * thresholds are unchanged — but they are no longer solid blocks of saturated
 * colour sitting on the corner of every card. A tinted field with a matching
 * ring says the same thing at a glance and lets twenty of these sit in a grid
 * without the page turning into a traffic light.
 */
const BADGE_TONE = {
  good: 'bg-emerald-500/12 text-emerald-700 ring-emerald-600/25 dark:text-emerald-400 dark:ring-emerald-400/25',
  mid: 'bg-amber-500/14 text-amber-700 ring-amber-600/25 dark:text-amber-400 dark:ring-amber-400/25',
  low: 'bg-rose-500/12 text-rose-700 ring-rose-600/25 dark:text-rose-400 dark:ring-rose-400/25',
} as const

function getTop40BadgeColor(count: number): string {
  if (count >= 40) return BADGE_TONE.good
  if (count >= 20) return BADGE_TONE.mid
  return BADGE_TONE.low
}

function getSpecialRequestsBadgeColor(count: number): string {
  return count > 0 ? BADGE_TONE.good : BADGE_TONE.low
}

export function MemberCard({
  id,
  name,
  surname,
  company,
  jobPosition,
  description,
  orgRole,
  logo,
  profileImage,
  phone,
  email,
  website,
  companyEmail,
  companyPhone,
  specialRequestsCount = 0,
  top40Count = 0,
}: Readonly<MemberCardProps>) {
  const renderImage = () => {
    if (profileImage) {
      return (
        <div className="relative mb-4 h-20 w-20 shrink-0">
          <img
            src={getThumbnailUrl(profileImage.url, 'thumbnail') || profileImage.url}
            alt={profileImage.alt || `${name} ${surname}`}
            className="h-full w-full rounded-full object-cover ring-1 ring-line dark:ring-line-dark"
          />
        </div>
      )
    }

    if (logo) {
      return (
        <div className="relative mb-4 h-20 w-20 shrink-0">
          <img
            src={getThumbnailUrl(logo.url, 'thumbnail') || logo.url}
            alt={logo.alt || company}
            className="h-full w-full rounded-full bg-neutral-100 object-contain p-2 ring-1 ring-line dark:bg-neutral-900 dark:ring-line-dark"
          />
        </div>
      )
    }

    return (
      <div className="mb-4 flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-neutral-100 ring-1 ring-line dark:bg-neutral-900 dark:ring-line-dark">
        <Building2 className="h-8 w-8 text-neutral-400" />
      </div>
    )
  }

  return (
    // The whole card navigates to the member, but it also carries `tel:`,
    // `mailto:` and website links. Wrapping everything in one <Link> nested
    // those anchors inside another anchor — invalid HTML that React reports as
    // a hydration error, and which browsers recover from unpredictably. The
    // card is a plain element with a stretched overlay link behind it instead;
    // the contact links sit above the overlay and stay independently clickable.
    <div className="card-surface group relative flex h-full flex-col p-6">
      <Link
        href={`/members/${id}`}
        aria-label={`${name} ${surname}`}
        className="absolute inset-0 z-0 rounded-xl"
      />

      {/* Badges */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <span
          className={`${getSpecialRequestsBadgeColor(specialRequestsCount)} tabular flex items-center gap-1 rounded-md px-1.5 py-1 font-mono text-[11px] font-medium ring-1 ring-inset`}
        >
          <FileText className="h-3 w-3" aria-hidden="true" />
          {specialRequestsCount}
        </span>
        <span
          className={`${getTop40BadgeColor(top40Count)} tabular flex items-center gap-1 rounded-md px-1.5 py-1 font-mono text-[11px] font-medium ring-1 ring-inset`}
        >
          <Users className="h-3 w-3" aria-hidden="true" />
          {top40Count}
        </span>
      </div>

      <div className="flex flex-col items-center text-center">
        {renderImage()}
        <div className="min-w-0">
          <h3 className="font-display font-semibold tracking-tight text-ink transition-colors group-hover:text-brand dark:text-surface-text">
            {name} {surname}
          </h3>
          <p className="mt-1 text-sm font-medium text-brand">{company}</p>
          {jobPosition && (
            <p className="mt-0.5 text-sm text-ink-soft dark:text-neutral-400">{jobPosition}</p>
          )}
        </div>
      </div>

      {description && (
        <p className="mt-5 line-clamp-3 text-sm leading-relaxed text-ink-soft dark:text-neutral-400">
          {description}
        </p>
      )}

      <div className="mt-5 space-y-2.5">
        {phone && (
          <a
            href={`tel:${phone}`}
            className="relative z-10 flex items-center gap-2.5 text-sm text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
          >
            <Phone className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span className="tabular font-mono text-xs">{phone}</span>
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="relative z-10 flex items-center gap-2.5 text-sm text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
          >
            <Mail className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span className="truncate">{email}</span>
          </a>
        )}
        {website && (
          <a
            href={`https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 flex items-center gap-2.5 text-sm text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
          >
            <Globe className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span className="truncate">{website}</span>
          </a>
        )}
      </div>

      {orgRole && (
        <div className="mt-auto pt-5">
          <span className="eyebrow inline-block rounded-full border border-brand/35 px-2.5 py-1 text-brand">
            {orgRole}
          </span>
        </div>
      )}
    </div>
  )
}
