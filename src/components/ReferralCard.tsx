'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Euro,
  Pencil,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useTranslations } from './TranslationsProvider'
import { ConfirmDialog } from './ConfirmDialog'

interface ReferralCardProps {
  referral: {
    id: string
    fromUser: {
      id: string
      name: string
      surname: string
    }
    toUser: {
      id: string
      name: string
      surname: string
    }
    date: string
    description: string
    status: 'pending' | 'success' | 'failed'
    value?: number | null
    createdBy: {
      id: string
    }
  }
  currentUserId: string
  viewMode: 'given' | 'received'
  onEdit: () => void
}

export function ReferralCard({
  referral,
  currentUserId,
  viewMode,
  onEdit,
}: Readonly<ReferralCardProps>) {
  const router = useRouter()
  const { t } = useTranslations()
  const [deleting, setDeleting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showValueInput, setShowValueInput] = useState(false)
  const [businessValue, setBusinessValue] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMarkFailedConfirm, setShowMarkFailedConfirm] = useState(false)

  const isCreator = String(referral.createdBy.id) === String(currentUserId)
  const isReceiver = String(referral.toUser.id) === String(currentUserId)
  const formattedDate = new Date(referral.date).toLocaleDateString('lv-LV')
  const hasLongDescription = referral.description.length > 40
  const canTakeAction = viewMode === 'received' && isReceiver && referral.status === 'pending'
  // Always expandable to see full description or take action
  const isExpandable = true

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/referrals/${referral.id}`, {
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

  const handleMarkSuccess = async () => {
    if (!businessValue || Number(businessValue) <= 0) {
      setShowValueInput(true)
      return
    }

    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/referrals/${referral.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'success', value: Number(businessValue) }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update')
      }

      setShowValueInput(false)
      setBusinessValue('')
      router.refresh()
    } catch (err) {
      console.error('Update error:', err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleMarkFailed = async () => {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/referrals/${referral.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'failed' }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update')
      }

      setShowMarkFailedConfirm(false)
      router.refresh()
    } catch (err) {
      console.error('Update error:', err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getStatusBadge = () => {
    switch (referral.status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            {t('activities', 'statusSuccess')}
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            {t('activities', 'statusFailed')}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
            <Clock className="h-3 w-3" />
            {t('activities', 'statusPending')}
          </span>
        )
    }
  }

  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm">
      {/* Compact header - responsive: 2 rows on mobile, 1 row on desktop */}
      <button
        type="button"
        className={`w-full px-3 py-2 text-left ${isExpandable ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50' : ''}`}
        onClick={() => isExpandable && setExpanded(!expanded)}
        disabled={!isExpandable}
        aria-expanded={expanded}
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
          {getStatusBadge()}
          {referral.status === 'success' && referral.value ? (
            <div className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
              <Euro className="h-3.5 w-3.5" />
              <span>{referral.value.toLocaleString('lv-LV')}</span>
            </div>
          ) : null}
          <div className="flex items-center gap-1 text-xs min-w-0">
            {viewMode === 'given' ? (
              <>
                <ArrowRight className="h-3.5 w-3.5 text-brand shrink-0" />
                <span className="text-ink dark:text-surface-text truncate">
                  {referral.toUser.name} {referral.toUser.surname.charAt(0)}.
                </span>
              </>
            ) : (
              <>
                <ArrowLeft className="h-3.5 w-3.5 text-green-600 shrink-0" />
                <span className="text-ink dark:text-surface-text truncate">
                  {referral.fromUser.name} {referral.fromUser.surname.charAt(0)}.
                </span>
              </>
            )}
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[150px]">
            {hasLongDescription ? `${referral.description.slice(0, 30)}...` : referral.description}
          </span>
          <div className="flex-1" />
          {isCreator && referral.status === 'pending' && (
            <div className="flex items-center">
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    onEdit()
                  }
                }}
                className="p-1 text-neutral-400 hover:text-brand transition-colors cursor-pointer"
                title={t('common', 'edit')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!deleting) setShowDeleteConfirm(true)
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !deleting) {
                    e.stopPropagation()
                    setShowDeleteConfirm(true)
                  }
                }}
                className={`p-1 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer ${deleting ? 'opacity-50' : ''}`}
                title={t('common', 'delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </div>
          )}
        </div>

        {/* Mobile: two rows */}
        <div className="sm:hidden">
          {/* Row 1: chevron, date, status, actions */}
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 shrink-0">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
            <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{formattedDate}</span>
            </div>
            {getStatusBadge()}
            <div className="flex-1" />
            {isCreator && referral.status === 'pending' && (
              <div className="flex items-center">
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      onEdit()
                    }
                  }}
                  className="p-1 text-neutral-400 hover:text-brand transition-colors cursor-pointer"
                  title={t('common', 'edit')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!deleting) setShowDeleteConfirm(true)
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !deleting) {
                      e.stopPropagation()
                      setShowDeleteConfirm(true)
                    }
                  }}
                  className={`p-1 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer ${deleting ? 'opacity-50' : ''}`}
                  title={t('common', 'delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </div>
            )}
          </div>
          {/* Row 2: user, value */}
          <div className="flex items-center gap-3 mt-1 ml-6">
            <div className="flex items-center gap-1 text-xs min-w-0">
              {viewMode === 'given' ? (
                <>
                  <ArrowRight className="h-3.5 w-3.5 text-brand shrink-0" />
                  <span className="text-ink dark:text-surface-text truncate">
                    {referral.toUser.name} {referral.toUser.surname.charAt(0)}.
                  </span>
                </>
              ) : (
                <>
                  <ArrowLeft className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  <span className="text-ink dark:text-surface-text truncate">
                    {referral.fromUser.name} {referral.fromUser.surname.charAt(0)}.
                  </span>
                </>
              )}
            </div>
            {referral.status === 'success' && referral.value ? (
              <div className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                <Euro className="h-3.5 w-3.5" />
                <span>{referral.value.toLocaleString('lv-LV')}</span>
              </div>
            ) : null}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-neutral-100 dark:border-neutral-700">
          {/* Referral details grid */}
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
                {t('activities', 'referralFrom')}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-ink dark:text-surface-text">
                <ArrowLeft className="h-4 w-4 text-green-600" />
                {referral.fromUser.name} {referral.fromUser.surname}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-1">
                {t('activities', 'referralTo')}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-ink dark:text-surface-text">
                <ArrowRight className="h-4 w-4 text-brand" />
                {referral.toUser.name} {referral.toUser.surname}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-1">
                {t('activities', 'status')}
              </div>
              <div className="flex items-center gap-1.5">
                {getStatusBadge()}
                {referral.status === 'success' && referral.value && (
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    €{referral.value.toLocaleString('lv-LV')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Full description */}
          <div className="mb-4">
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-1">
              {t('activities', 'referralDescription')}
            </div>
            <p className="text-sm text-ink dark:text-surface-text whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3">
              {referral.description}
            </p>
          </div>

          {/* Status actions for receiver when pending */}
          {canTakeAction && (
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700">
              {showValueInput ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                      {t('activities', 'enterBusinessValue')}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-ink dark:text-surface-text">€</span>
                      <input
                        type="number"
                        value={businessValue}
                        onChange={(e) => setBusinessValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 border border-neutral-300 dark:border-neutral-600 bg-white text-ink dark:bg-surface dark:text-surface-text rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand focus:border-transparent"
                        placeholder="0"
                        min="1"
                        autoFocus
                      />
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMarkSuccess()
                    }}
                    disabled={updatingStatus || !businessValue}
                    className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                    title={t('common', 'confirm')}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowValueInput(false)
                      setBusinessValue('')
                    }}
                    className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                    title={t('common', 'cancel')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowValueInput(true)
                    }}
                    disabled={updatingStatus}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {t('activities', 'markSuccess')}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMarkFailedConfirm(true)
                    }}
                    disabled={updatingStatus}
                    className="flex items-center gap-2 px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm rounded hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    {t('activities', 'markFailed')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('common', 'delete')}
        message={t('activities', 'confirmDeleteReferral')}
        confirmText={t('common', 'delete')}
        cancelText={t('common', 'cancel')}
        isDestructive
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={showMarkFailedConfirm}
        onClose={() => setShowMarkFailedConfirm(false)}
        onConfirm={handleMarkFailed}
        title={t('activities', 'markFailed')}
        message={t('activities', 'confirmMarkFailed')}
        confirmText={t('common', 'confirm')}
        cancelText={t('common', 'cancel')}
        isDestructive
        loading={updatingStatus}
      />
    </div>
  )
}
