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
    // The "on the slide" state was a brand border *plus* a brand ring — two
    // rings of the same colour, which just read as a thick red box. One ring
    // and a tinted wash says "picked" without shouting.
    <div
      className={`panel group p-4 transition-colors ${
        isOnSlide ? 'border-brand/45 bg-brand/4 dark:bg-brand/8' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {showDragHandle && (
          <div
            className="shrink-0 cursor-grab pt-0.5 text-neutral-300 transition-colors group-hover:text-neutral-500 active:cursor-grabbing dark:text-neutral-600 dark:group-hover:text-neutral-400"
            title={t('profile', 'dragToReorder')}
            aria-hidden="true"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-ink dark:text-surface-text">{request.request}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-400 dark:text-neutral-500">
            {request.registrationNumber && (
              <>
                <span className="tabular font-mono">
                  {t('common', 'regNumber')}: {request.registrationNumber}
                </span>
                <span className="text-neutral-300 dark:text-neutral-600">·</span>
              </>
            )}
            <span className="tabular font-mono">
              {t('common', 'added')}: {new Date(request.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {showActions && onEdit && onDelete && (
          <div className="flex shrink-0 gap-0.5">
            {onToggleSlide && (
              <button
                type="button"
                onClick={() => onToggleSlide(request.id)}
                className="icon-btn icon-btn-brand"
                data-active={isOnSlide}
                title={isOnSlide ? t('profile', 'shownOnSlide') : t('profile', 'showOnSlide')}
                aria-pressed={isOnSlide}
              >
                <MonitorPlay className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                onEdit({
                  id: request.id,
                  request: request.request,
                  registrationNumber: request.registrationNumber,
                })
              }
              className="icon-btn icon-btn-brand"
              title={t('common', 'edit')}
              aria-label={t('common', 'edit')}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(request.id)}
              disabled={isDeleting}
              className="icon-btn icon-btn-danger"
              title={t('common', 'delete')}
              aria-label={t('common', 'delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
