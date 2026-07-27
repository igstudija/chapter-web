'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Mail, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { useTranslations } from './TranslationsProvider'

interface EmailChangeModalProps {
  isOpen: boolean
  onClose: () => void
  currentEmail: string
  pendingEmail?: string | null
  onSuccess: () => void
}

export function EmailChangeModal({
  isOpen,
  onClose,
  currentEmail,
  pendingEmail: initialPendingEmail,
  onSuccess,
}: EmailChangeModalProps) {
  const { t } = useTranslations()
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [pendingEmail, setPendingEmail] = useState(initialPendingEmail || null)
  const [canceling, setCanceling] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    setPendingEmail(initialPendingEmail || null)
  }, [initialPendingEmail])

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal()
      setNewEmail('')
      setError('')
      setSuccess(false)
    } else {
      dialogRef.current?.close()
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch('/api/users/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newEmail }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'Email already in use') {
          setError(t('profile', 'emailAlreadyInUse'))
        } else if (data.error === 'New email is same as current email') {
          setError(t('profile', 'emailSameAsCurrent'))
        } else {
          setError(data.error || t('login', 'errorOccurred'))
        }
        return
      }

      setSuccess(true)
      setPendingEmail(data.pendingEmail)
      setNewEmail('')
      onSuccess()
    } catch (err) {
      console.error('Email change error:', err)
      setError(t('login', 'errorOccurred'))
    } finally {
      setLoading(false)
    }
  }

  const handleCancelPending = async () => {
    setCanceling(true)
    try {
      const res = await fetch('/api/users/change-email', {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        setPendingEmail(null)
        setSuccess(false)
        onSuccess()
      }
    } catch (err) {
      console.error('Cancel error:', err)
    } finally {
      setCanceling(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="m-auto bg-transparent p-0 backdrop:bg-black/50 open:flex"
    >
      <div className="modal-panel mx-4 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-ink dark:text-surface-text flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand" />
            {t('profile', 'changeEmail')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Info box */}
          <div className="alert alert-info mb-4" role="alert">
            <Info className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{t('profile', 'emailChangeInfo')}</p>
          </div>

          {/* Current email */}
          <div className="mb-4">
            <label className="field-label">
              {t('profile', 'currentEmail')}
            </label>
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400">
              {currentEmail}
            </div>
          </div>

          {/* Pending email change */}
          {pendingEmail && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {t('profile', 'pendingEmailChange')}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 font-mono mt-1">
                    {pendingEmail}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                    {t('profile', 'checkInboxForVerification')}
                  </p>
                  <button
                    onClick={handleCancelPending}
                    disabled={canceling}
                    className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200 underline disabled:opacity-50"
                  >
                    {canceling ? (
                      <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                    ) : null}
                    {t('profile', 'cancelEmailChange')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success message */}
          {success && !pendingEmail && (
            <div className="alert alert-success mb-4" role="alert">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p>{t('profile', 'emailVerificationSent')}</p>
            </div>
          )}

          {/* New email form */}
          {!pendingEmail && (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="alert alert-error mb-4" role="alert">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="mb-4">
                <label
                  htmlFor="newEmail"
                  className="field-label"
                >
                  {t('profile', 'newEmail')}
                </label>
                <input
                  type="email"
                  id="newEmail"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value.toLowerCase())}
                  required
                  className="field"
                  placeholder="example@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !newEmail}
                className="btn btn-primary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('profile', 'sendVerification')}
              </button>
            </form>
          )}
        </div>
      </div>
    </dialog>
  )
}
