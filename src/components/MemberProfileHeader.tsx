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
    <div className="bg-white dark:bg-surface-raised rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="shrink-0">
          {profileImage?.url ? (
            <img
              src={getThumbnailUrl(profileImage.url, 'card') || profileImage.url}
              alt={member.name}
              width={120}
              height={120}
              className="rounded-full object-cover w-28 h-28"
            />
          ) : (
            <div className="w-28 h-28 bg-brand rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {member.name?.charAt(0)}
              {member.surname?.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-bold text-ink dark:text-surface-text">
            {member.name} {member.surname}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300">
            {member.jobPosition || t('profile', 'member')}, {member.company}
          </p>

          <div className="flex flex-wrap gap-4 mt-4 text-sm text-neutral-600 dark:text-neutral-300">
            {(member.loginEmail || member.companyEmail) && (
              <a
                href={`mailto:${member.loginEmail || member.companyEmail}`}
                className="flex items-center gap-1 hover:text-brand"
              >
                <Mail className="h-4 w-4" />
                {member.loginEmail || member.companyEmail}
              </a>
            )}
            {(member.phone || member.companyPhone) && (
              <a
                href={`tel:${member.phone || member.companyPhone}`}
                className="flex items-center gap-1 hover:text-brand"
              >
                <Phone className="h-4 w-4" />
                {member.phone || member.companyPhone}
              </a>
            )}
            {member.website && (
              <a
                href={`https://${member.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-brand"
              >
                <Globe className="h-4 w-4" />
                {member.website}
              </a>
            )}
          </div>

          {previewLink && (
            <Link
              href={previewLink}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors text-sm font-medium"
            >
              <Eye className="h-4 w-4" />
              {t('profile', 'previewOthers')}
            </Link>
          )}
        </div>

        {logo?.url && (
          <div className="shrink-0 hidden md:block bg-white rounded-lg p-2">
            <img
              src={getThumbnailUrl(logo.url, 'card') || logo.url}
              alt={member.company}
              width={140}
              height={70}
              className="object-contain max-h-16"
            />
          </div>
        )}
      </div>
    </div>
  )
}
