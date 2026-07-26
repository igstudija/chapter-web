'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  MapPin,
  MessageCircle,
  Pencil,
  Trash2,
  Send,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useTranslations } from './TranslationsProvider'
import { ConfirmDialog } from './ConfirmDialog'

interface Comment {
  text: string
  author: {
    id: string
    name: string
    surname: string
  }
  commentCreatedAt: string
}

interface MeetingCardProps {
  readonly meeting: {
    readonly id: string
    readonly metWith: {
      readonly id: string
      readonly name: string
      readonly surname: string
    }
    readonly invitedBy: {
      readonly id: string
      readonly name: string
      readonly surname: string
    }
    readonly location: string
    readonly topics: string
    readonly date: string
    readonly comments?: readonly Comment[]
    readonly createdBy: {
      readonly id: string
    }
  }
  readonly currentUserId: string
  readonly onEdit: () => void
}

export function MeetingCard({ meeting, currentUserId, onEdit }: MeetingCardProps) {
  const router = useRouter()
  const { t } = useTranslations()
  const [expanded, setExpanded] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isCreator = String(meeting.createdBy.id) === String(currentUserId)
  const formattedDate = new Date(meeting.date).toLocaleDateString('lv-LV')
  const commentCount = meeting.comments?.length || 0
  // Always expandable to add comments or view topics
  const isExpandable = true

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/one-to-one-meetings/${meeting.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }

      setShowDeleteConfirm(false)
      router.refresh()
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`/api/one-to-one-meetings/${meeting.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add comment')
      }

      setNewComment('')
      router.refresh()
    } catch (err) {
      console.error('Comment error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel">
      {/* Compact header - responsive: 2 rows on mobile, 1 row on desktop */}
      <div
        role="button"
        tabIndex={0}
        className={`w-full text-left px-3 py-2 ${isExpandable ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50' : ''}`}
        onClick={() => isExpandable && setExpanded(!expanded)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && isExpandable) {
            e.preventDefault()
            setExpanded(!expanded)
          }
        }}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse meeting details' : 'Expand meeting details'}
      >
        {/* Desktop: single row */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-neutral-400 shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
          <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <MapPin className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <span className="text-ink dark:text-surface-text truncate">
              {meeting.location}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs min-w-0">
            <User className="h-3.5 w-3.5 text-brand shrink-0" />
            <span className="text-ink dark:text-surface-text truncate">
              {meeting.metWith.name} {meeting.metWith.surname.charAt(0)}.
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs min-w-0">
            <User className="h-3.5 w-3.5 text-accent shrink-0" />
            <span className="text-ink dark:text-surface-text truncate">
              {meeting.invitedBy.name} {meeting.invitedBy.surname.charAt(0)}.
            </span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-0.5 text-xs text-neutral-400">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>{commentCount}</span>
          </div>
          {isCreator && (
            <div className="flex items-center pointer-events-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
                className="p-1 text-neutral-400 hover:text-brand transition-colors"
                title={t('common', 'edit')}
                type="button"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteConfirm(true)
                }}
                disabled={deleting}
                className="p-1 text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50"
                title={t('common', 'delete')}
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile: two rows */}
        <div className="sm:hidden">
          {/* Row 1: chevron, date, location, actions */}
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 shrink-0">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
            <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1 text-xs min-w-0 flex-1">
              <MapPin className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <span className="text-ink dark:text-surface-text truncate">
                {meeting.location}
              </span>
            </div>
            <div className="flex items-center gap-0.5 text-xs text-neutral-400">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{commentCount}</span>
            </div>
            {isCreator && (
              <div className="flex items-center pointer-events-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                  className="p-1 text-neutral-400 hover:text-brand transition-colors"
                  title={t('common', 'edit')}
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteConfirm(true)
                  }}
                  disabled={deleting}
                  className="p-1 text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  title={t('common', 'delete')}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          {/* Row 2: met with, invited by */}
          <div className="flex items-center gap-3 mt-1 ml-6">
            <div className="flex items-center gap-1 text-xs min-w-0">
              <User className="h-3.5 w-3.5 text-brand shrink-0" />
              <span className="text-ink dark:text-surface-text truncate">
                {meeting.metWith.name} {meeting.metWith.surname.charAt(0)}.
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs min-w-0">
              <User className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="text-ink dark:text-surface-text truncate">
                {meeting.invitedBy.name} {meeting.invitedBy.surname.charAt(0)}.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-neutral-100 dark:border-neutral-700">
          {/* Meeting details grid */}
          <div className="pt-3 grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-1">
                {t('activities', 'date')}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-ink dark:text-surface-text">
                <Calendar className="h-4 w-4 text-neutral-400" />
                {formattedDate}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-1">
                {t('activities', 'location')}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-ink dark:text-surface-text">
                <MapPin className="h-4 w-4 text-neutral-400" />
                {meeting.location}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-1">
                {t('activities', 'metWith')}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-ink dark:text-surface-text">
                <User className="h-4 w-4 text-brand" />
                {meeting.metWith.name} {meeting.metWith.surname}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-1">
                {t('activities', 'invitedBy')}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-ink dark:text-surface-text">
                <User className="h-4 w-4 text-accent" />
                {meeting.invitedBy.name} {meeting.invitedBy.surname}
              </div>
            </div>
          </div>

          {/* Topics */}
          <div className="mb-4">
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-1">
              {t('activities', 'topics')}
            </div>
            <p className="text-sm text-ink dark:text-surface-text whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3">
              {meeting.topics}
            </p>
          </div>

          {/* Comments */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700">
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2 uppercase">
              {t('activities', 'comments')} ({commentCount})
            </div>

            {meeting.comments && meeting.comments.length > 0 ? (
              <div className="space-y-2 mb-3">
                {meeting.comments.map((comment) => (
                  <div
                    key={`${comment.author.id}-${comment.commentCreatedAt}`}
                    className="bg-neutral-50 dark:bg-neutral-900 rounded p-2 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-ink dark:text-surface-text text-xs">
                        {comment.author.name} {comment.author.surname}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {new Date(comment.commentCreatedAt).toLocaleDateString('lv-LV')}
                      </span>
                    </div>
                    <p className="text-ink dark:text-surface-text text-sm">{comment.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 mb-3">{t('activities', 'noComments')}</p>
            )}

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t('activities', 'addComment')}
                className="flex-1 border border-neutral-300 dark:border-neutral-600 bg-white text-ink dark:bg-surface dark:text-surface-text rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand focus:border-transparent"
              />
              <button
                type="submit"
                disabled={loading || !newComment.trim()}
                className="px-3 py-1.5 bg-brand text-white rounded hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('common', 'delete')}
        message={t('activities', 'confirmDeleteMeeting')}
        confirmText={t('common', 'delete')}
        cancelText={t('common', 'cancel')}
        isDestructive
        loading={deleting}
      />
    </div>
  )
}
