'use client'

import { Pencil, Trash2, Award, User } from 'lucide-react'
import { formatDateShort } from '@/lib/formatDate'
import Link from 'next/link'
import { useTranslations } from './TranslationsProvider'

interface PartnerMember {
  id: string | number
  name: string
  surname: string
  slug?: string
}

interface SuccessStoryCardProps {
  story: {
    id: string | number
    title: string
    story: string
    businessValue?: string | null
    partnerMember?: PartnerMember | string | number | null
    createdAt: string
  }
  showActions?: boolean
  onEdit?: (story: {
    id: string | number
    title: string
    story: string
    businessValue?: string | null
    partnerMember?: string | number | null
  }) => void
  onDelete?: (id: string | number) => void
  isDeleting?: boolean
}

export function SuccessStoryCard({
  story,
  showActions = false,
  onEdit,
  onDelete,
  isDeleting = false,
}: SuccessStoryCardProps) {
  const { t } = useTranslations()
  const partnerMember =
    typeof story.partnerMember === 'object' && story.partnerMember
      ? story.partnerMember
      : null

  return (
    <div className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-ink dark:text-surface-text mb-2">
            {story.title}
          </h3>
          <div
            className="text-neutral-600 dark:text-neutral-300 prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: story.story }}
          />

          <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
            {story.businessValue && (
              <div className="flex items-center gap-1.5 text-sm">
                <Award className="h-4 w-4 text-brand" />
                <span className="font-medium text-ink dark:text-surface-text">
                  {story.businessValue}
                </span>
              </div>
            )}

            {partnerMember && (
              <div className="flex items-center gap-1.5 text-sm">
                <User className="h-4 w-4 text-neutral-400" />
                {partnerMember.slug ? (
                  <Link
                    href={`/members/${partnerMember.slug}`}
                    className="text-brand hover:underline"
                  >
                    {partnerMember.name} {partnerMember.surname}
                  </Link>
                ) : (
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {partnerMember.name} {partnerMember.surname}
                  </span>
                )}
              </div>
            )}

            <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-auto">
              {formatDateShort(story.createdAt)}
            </span>
          </div>
        </div>

        {showActions && onEdit && onDelete && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() =>
                onEdit({
                  id: story.id,
                  title: story.title,
                  story: story.story,
                  businessValue: story.businessValue,
                  partnerMember:
                    typeof story.partnerMember === 'object' && story.partnerMember
                      ? story.partnerMember.id
                      : null,
                })
              }
              className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-brand dark:hover:text-brand transition-colors"
              title={t('common', 'edit')}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(story.id)}
              disabled={isDeleting}
              className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-500 transition-colors disabled:opacity-50"
              title={t('common', 'delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
