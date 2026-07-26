'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Mail, Phone, Globe, Eye } from 'lucide-react'
import { getThumbnailUrl } from '@/lib/getThumbnailUrl'
import { useTranslations } from './TranslationsProvider'

interface MemberProfileHeaderProps {
  member: {
    name: string
    surname: string
    company: string
    jobPosition?: string | null
    companyEmail?: string | null
    phone?: string | null
    companyPhone?: string | null
    website?: string | null
    loginEmail?: string | null
  }
  profileImage?: {
    url: string
    alt?: string | null
  } | null
  logo?: {
    url: string
    alt?: string | null
  } | null
  previewLink?: string
}

export function MemberProfileHeader({
  member,
  profileImage,
  logo,
  previewLink,
}: MemberProfileHeaderProps) {
  const { t } = useTranslations()
  return (
    /*
      The masthead of the member area. It used to be a shadowed white card
      floating on a grey page — the same treatment as the content below it, so
      nothing established that this is the top of the screen. It is now the
      page's own header: no card, a hairline closing it off, and the name at
      display size so the hierarchy is stated once rather than repeated.
    */
    <header className="mb-8 border-b border-line pb-8 dark:border-line-dark">
      <div className="flex flex-col items-start gap-6 md:flex-row md:gap-8">
        <div className="shrink-0">
          {profileImage?.url ? (
            <img
              src={getThumbnailUrl(profileImage.url, 'card') || profileImage.url}
              alt={member.name}
              width={120}
              height={120}
              className="h-28 w-28 rounded-full object-cover ring-1 ring-line dark:ring-line-dark"
            />
          ) : (
            /*
              A solid brand-red disc with white initials was the loudest thing
              on the page and said nothing. Initials on a hairline circle read
              as a placeholder, which is what it is.
            */
            <div className="flex h-28 w-28 items-center justify-center rounded-full border border-line font-display text-3xl font-bold tracking-tight text-brand dark:border-line-dark">
              {member.name?.charAt(0)}
              {member.surname?.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="display-2 text-ink dark:text-surface-text">
            {member.name} {member.surname}
          </h1>
          <p className="mt-2 text-base text-ink-soft dark:text-neutral-400">
            {member.jobPosition || t('profile', 'member')}, {member.company}
          </p>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2.5 text-sm">
            {(member.loginEmail || member.companyEmail) && (
              <a
                href={`mailto:${member.loginEmail || member.companyEmail}`}
                className="flex items-center gap-2 text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {member.loginEmail || member.companyEmail}
              </a>
            )}
            {(member.phone || member.companyPhone) && (
              <a
                href={`tel:${member.phone || member.companyPhone}`}
                className="tabular flex items-center gap-2 font-mono text-xs text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {member.phone || member.companyPhone}
              </a>
            )}
            {member.website && (
              <a
                href={`https://${member.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
              >
                <Globe className="h-3.5 w-3.5 shrink-0" />
                {member.website}
              </a>
            )}
          </div>

          {previewLink && (
            <Link href={previewLink} className="btn btn-line mt-6 px-4 py-2.5 text-sm">
              <Eye className="h-4 w-4" />
              {t('profile', 'previewOthers')}
            </Link>
          )}
        </div>

        {logo?.url && (
          <div className="hidden shrink-0 rounded-lg bg-white p-3 ring-1 ring-line md:block">
            <img
              src={getThumbnailUrl(logo.url, 'card') || logo.url}
              alt={member.company}
              width={140}
              height={70}
              className="max-h-16 object-contain"
            />
          </div>
        )}
      </div>
    </header>
  )
}
