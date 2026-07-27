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
    <div className="list-row group">
      {/* Row 1: number + company + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="list-index w-6 pt-0.5">{index + 1}</span>
          <span className="text-sm font-medium break-words text-ink dark:text-surface-text">
            {entry.companyName}
          </span>
        </div>
        {showActions && onEdit && onDelete && (
          // Bordered mini-buttons on every row made the list look like a
          // toolbar stack; these surface on hover and on keyboard focus.
          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="icon-btn icon-btn-brand"
              title="Edit"
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(entry.id)}
              disabled={isDeleting}
              className="icon-btn icon-btn-danger"
              title="Delete"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      {/* Row 2: details */}
      <div className="mt-0.5 ml-9 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-soft dark:text-neutral-400">
        {entry.contactPerson && <span>{entry.contactPerson}</span>}
        {entry.position && (
          <>
            <span className="text-neutral-300 dark:text-neutral-600">·</span>
            <span>{entry.position}</span>
          </>
        )}
        {entry.registrationNumber && (
          <>
            <span className="text-neutral-300 dark:text-neutral-600">·</span>
            <span className="tabular font-mono">{entry.registrationNumber}</span>
          </>
        )}
        <span className="text-neutral-300 dark:text-neutral-600">·</span>
        <span className="tabular font-mono text-neutral-400 dark:text-neutral-500">
          {new Date(entry.createdAt).toLocaleDateString('lv-LV')}
        </span>
      </div>
      {/* Row 3: tags + notes */}
      {(entry.businessTags || entry.notes) && (
        <div className="mt-1.5 ml-9 flex flex-wrap items-center gap-x-3 gap-y-1">
          {entry.businessTags && <TagCloud tags={entry.businessTags} />}
          {entry.notes && (
            <p className="line-clamp-1 text-xs text-neutral-400 dark:text-neutral-500">
              {entry.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
