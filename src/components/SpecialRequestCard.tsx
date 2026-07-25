'use client'

import { Pencil, Trash2, GripVertical, MonitorPlay } from 'lucide-react'
import { useTranslations } from './TranslationsProvider'

interface SpecialRequestCardProps {
  request: {
    id: string | number
    request: string
    registrationNumber?: string | null
    createdAt: string
  }
  showActions?: boolean
  onEdit?: (request: { id: string | number; request: string; registrationNumber?: string | null }) => void
  onDelete?: (id: string | number) => void
  isDeleting?: boolean
  showDragHandle?: boolean
  isOnSlide?: boolean
  onToggleSlide?: (id: string | number) => void
}

export function SpecialRequestCard({
  request,
  showActions = false,
  onEdit,
  onDelete,
  isDeleting = false,
  showDragHandle = false,
  isOnSlide = false,
  onToggleSlide,
}: SpecialRequestCardProps) {
  const { t } = useTranslations()

  return (
    <div
      className={`p-4 bg-white dark:bg-neutral-800 border rounded-lg transition-colors ${
        isOnSlide
          ? 'border-brand ring-1 ring-brand'
          : 'border-neutral-200 dark:border-neutral-600'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {showDragHandle && (
          <div
            className="shrink-0 cursor-grab active:cursor-grabbing text-neutral-400 dark:text-neutral-500 pt-0.5"
            title={t('profile', 'dragToReorder')}
            aria-hidden="true"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-medium text-ink dark:text-surface-text">{request.request}</h3>
          {request.registrationNumber && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('common', 'regNumber')}: {request.registrationNumber}
            </p>
          )}
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            {t('common', 'added')}: {new Date(request.createdAt).toLocaleString()}
          </p>
        </div>

        {showActions && onEdit && onDelete && (
          <div className="flex gap-2 shrink-0">
            {onToggleSlide && (
              <button
                onClick={() => onToggleSlide(request.id)}
                className={`p-2 transition-colors ${
                  isOnSlide
                    ? 'text-brand'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-brand dark:hover:text-brand'
                }`}
                title={isOnSlide ? t('profile', 'shownOnSlide') : t('profile', 'showOnSlide')}
                aria-pressed={isOnSlide}
              >
                <MonitorPlay className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() =>
                onEdit({
                  id: request.id,
                  request: request.request,
                  registrationNumber: request.registrationNumber,
                })
              }
              className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-brand dark:hover:text-brand transition-colors"
              title={t('common', 'edit')}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(request.id)}
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
