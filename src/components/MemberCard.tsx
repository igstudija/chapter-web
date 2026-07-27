'use client'

import Link from 'next/link'
import { Building2, Globe, Mail, Phone, FileText } from 'lucide-react'
import { getThumbnailUrl } from '@/lib/getThumbnailUrl'
import { LIST_TARGETS, memberRating } from '@/lib/memberRating'
import { useTranslations } from './TranslationsProvider'

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
  top20Count?: number
}

/**
 * Badge colours carry three states — done, started, empty. They are tinted
 * fields with a matching ring rather than solid blocks of saturated colour, so
 * twenty of these can sit in a grid without the page turning into a traffic
 * light.
 */
const BADGE_TONE = {
  good: 'bg-emerald-500/12 text-emerald-700 ring-emerald-600/25 dark:text-emerald-400 dark:ring-emerald-400/25',
  mid: 'bg-amber-500/14 text-amber-700 ring-amber-600/25 dark:text-amber-400 dark:ring-amber-400/25',
  low: 'bg-rose-500/12 text-rose-700 ring-rose-600/25 dark:text-rose-400 dark:ring-rose-400/25',
} as const

/** Done when the target is met, started when there is anything at all. */
function listTone(count: number, target: number): string {
  if (count >= target) return BADGE_TONE.good
  if (count > 0) return BADGE_TONE.mid
  return BADGE_TONE.low
}

/** A member either has special requests on file or does not; there is no target. */
function requestTone(count: number): string {
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
  specialRequestsCount = 0,
  top40Count = 0,
  top20Count = 0,
}: Readonly<MemberCardProps>) {
  const { t } = useTranslations()
  // The card and the group heading read from one formula, so the two figures
  // can never disagree about the same member.
  const pct = memberRating({ top40Count, top20Count, specialRequestsCount })

  const renderImage = () => {
    if (profileImage) {
      return (
        <img
          src={getThumbnailUrl(profileImage.url, 'thumbnail') || profileImage.url}
          alt={profileImage.alt || `${name} ${surname}`}
          className="h-20 w-20 rounded-full object-cover ring-1 ring-line dark:ring-line-dark"
        />
      )
    }

    if (logo) {
      return (
        <img
          src={getThumbnailUrl(logo.url, 'thumbnail') || logo.url}
          alt={logo.alt || company}
          className="h-20 w-20 rounded-full bg-white object-contain p-2 ring-1 ring-line dark:ring-line-dark"
        />
      )
    }

    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 ring-1 ring-line dark:bg-neutral-900 dark:ring-line-dark">
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
    <div className="card-surface group relative flex h-full flex-col overflow-hidden p-6 pb-5">
      <Link
        href={`/members/${id}`}
        aria-label={`${name} ${surname}`}
        className="absolute inset-0 z-0 rounded-xl"
      />

      {/* Three lists, three badges, stacked down the corner. Side by side they
          ran into the name on a narrow card and there was no room for a third. */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
        <span
          className={`${requestTone(specialRequestsCount)} tabular flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium ring-1 ring-inset`}
          title={`${t('members', 'specialRequests')}: ${specialRequestsCount}`}
        >
          <FileText className="h-3 w-3" aria-hidden="true" />
          {specialRequestsCount}
        </span>
        <span
          className={`${listTone(top40Count, LIST_TARGETS.top40)} tabular rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium ring-1 ring-inset`}
          title={`${t('members', 'top40')}: ${top40Count}/${LIST_TARGETS.top40}`}
        >
          {top40Count}
          <span className="opacity-50">/{LIST_TARGETS.top40}</span>
        </span>
        <span
          className={`${listTone(top20Count, LIST_TARGETS.top20)} tabular rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium ring-1 ring-inset`}
          title={`${t('members', 'top20')}: ${top20Count}/${LIST_TARGETS.top20}`}
        >
          {top20Count}
          <span className="opacity-50">/{LIST_TARGETS.top20}</span>
        </span>
      </div>

      <div className="flex flex-col items-center pt-1 text-center">
        <div className="relative mb-4 shrink-0">{renderImage()}</div>
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

      <div className="mt-auto pt-5">
        {orgRole && (
          <span className="eyebrow mb-3 inline-block rounded-full border border-brand/35 px-2.5 py-1 text-brand">
            {orgRole}
          </span>
        )}
        {/* The three badges say what is filed; this says how far along that is.
            One hairline, the same figure the group heading is rated by. */}
        <div className="flex items-center gap-2.5">
          <div
            className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${name} ${surname}`}
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="tabular font-mono text-[11px] text-ink-soft dark:text-neutral-400">
            {Math.round(pct)}%
          </span>
        </div>
      </div>
    </div>
  )
}
