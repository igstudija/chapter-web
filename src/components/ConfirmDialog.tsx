'use client'

import { X } from 'lucide-react'
import { useTranslations } from './TranslationsProvider'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = true,
  loading = false,
}: ConfirmDialogProps) {
  const { t } = useTranslations()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="fixed inset-0 bg-neutral-950/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div className="relative bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink dark:text-surface-text">{title}</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-neutral-600 dark:text-neutral-300 mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors font-medium disabled:opacity-50"
          >
            {cancelText || t('common', 'cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 ${
              isDestructive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-brand text-white hover:bg-brand-dark'
            }`}
          >
            {loading ? t('common', 'deleting') : confirmText || t('common', 'delete')}
          </button>
        </div>
      </div>
    </div>
  )
}
