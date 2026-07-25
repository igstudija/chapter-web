import { Pencil, Trash2 } from 'lucide-react'
import { TagCloud } from './TagCloud'

interface Top40Entry {
  id: string | number
  companyName: string
  contactPerson?: string | null
  position?: string | null
  registrationNumber?: string | null
  notes?: string | null
  businessTags?: string | null
  createdAt: string
}

interface Top40EntryRowProps {
  entry: Top40Entry
  index: number
  showActions?: boolean
  onEdit?: (entry: Top40Entry) => void
  onDelete?: (id: string | number) => void
  isDeleting?: boolean
}

export function Top40EntryRow({
  entry,
  index,
  showActions = false,
  onEdit,
  onDelete,
  isDeleting = false,
}: Top40EntryRowProps) {
  return (
    <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
      {/* Row 1: number + company + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-sm text-neutral-400 dark:text-neutral-500 font-medium shrink-0 pt-0.5 w-6 text-right">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-ink dark:text-surface-text break-words">
            {entry.companyName}
          </span>
        </div>
        {showActions && onEdit && onDelete && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onEdit(entry)}
              className="p-1.5 border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
            </button>
            <button
              onClick={() => onDelete(entry.id)}
              disabled={isDeleting}
              className="p-1.5 border border-neutral-300 dark:border-neutral-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-500" />
            </button>
          </div>
        )}
      </div>
      {/* Row 2: details */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 ml-9 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
        <span>{entry.contactPerson}</span>
        {entry.position && (
          <>
            <span className="text-neutral-300 dark:text-neutral-600">·</span>
            <span>{entry.position}</span>
          </>
        )}
        {entry.registrationNumber && (
          <>
            <span className="text-neutral-300 dark:text-neutral-600">·</span>
            <span>{entry.registrationNumber}</span>
          </>
        )}
        <span className="text-neutral-300 dark:text-neutral-600">·</span>
        <span className="text-neutral-400 dark:text-neutral-500">
          {new Date(entry.createdAt).toLocaleDateString('lv-LV')}
        </span>
      </div>
      {/* Row 3: tags + notes */}
      {(entry.businessTags || entry.notes) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ml-9 mt-1.5">
          {entry.businessTags && (
            <TagCloud tags={entry.businessTags} />
          )}
          {entry.notes && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 italic line-clamp-1">
              {entry.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
