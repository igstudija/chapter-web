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

function getTop40BadgeColor(count: number): string {
  if (count >= 40) return 'bg-green-500 dark:bg-green-800'
  if (count >= 20) return 'bg-orange-500 dark:bg-orange-800'
  return 'bg-red-500 dark:bg-red-800'
}

function getSpecialRequestsBadgeColor(count: number): string {
  return count > 0 ? 'bg-green-500 dark:bg-green-800' : 'bg-red-500 dark:bg-red-800'
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
        <div className="relative w-20 h-20 shrink-0 mb-3">
          <img
            src={getThumbnailUrl(profileImage.url, 'thumbnail') || profileImage.url}
            alt={profileImage.alt || `${name} ${surname}`}
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      )
    }

    if (logo) {
      return (
        <div className="relative w-20 h-20 shrink-0 mb-3">
          <img
            src={getThumbnailUrl(logo.url, 'thumbnail') || logo.url}
            alt={logo.alt || company}
            className="w-full h-full object-contain rounded-full bg-neutral-100 dark:bg-neutral-800"
          />
        </div>
      )
    }

    return (
      <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center shrink-0 mb-3">
        <Building2 className="h-10 w-10 text-neutral-400" />
      </div>
    )
  }

  return (
    <Link
      href={`/members/${id}`}
      className="block bg-white dark:bg-neutral-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow relative"
    >
      {/* Badges */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <div className="flex items-center gap-0.5">
          <FileText className="h-3 w-3 text-neutral-400" />
          <span
            className={`${getSpecialRequestsBadgeColor(specialRequestsCount)} text-white text-xs font-bold px-1.5 py-0.5 rounded min-w-[20px] text-center`}
          >
            {specialRequestsCount}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Users className="h-3 w-3 text-neutral-400" />
          <span
            className={`${getTop40BadgeColor(top40Count)} text-white text-xs font-bold px-1.5 py-0.5 rounded min-w-[20px] text-center`}
          >
            {top40Count}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center text-center">
        {renderImage()}
        <div className="min-w-0">
          <h3 className="font-semibold text-ink dark:text-surface-text">
            {name} {surname}
          </h3>
          <p className="text-brand font-medium text-sm">{company}</p>
          {jobPosition && (
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">{jobPosition}</p>
          )}
        </div>
      </div>

      {description && (
        <p className="text-neutral-600 dark:text-neutral-300 mt-4 text-sm line-clamp-3">
          {description}
        </p>
      )}

      <div className="mt-4 space-y-2">
        {phone && (
          <a
            href={`tel:${phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 hover:text-brand transition-colors"
          >
            <Phone className="h-4 w-4" />
            <span>{phone}</span>
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 hover:text-brand transition-colors"
          >
            <Mail className="h-4 w-4" />
            <span className="truncate">{email}</span>
          </a>
        )}
        {website && (
          <a
            href={`https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 hover:text-brand transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span className="truncate">{website}</span>
          </a>
        )}
      </div>

      {orgRole && (
        <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700">
          <span className="inline-block bg-brand text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {orgRole}
          </span>
        </div>
      )}
    </Link>
  )
}
