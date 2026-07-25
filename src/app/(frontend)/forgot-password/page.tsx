'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/components'

export default function ForgotPasswordPage() {
  const { t } = useTranslations()
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const formLoadTime = useRef<number>(Date.now())

  useEffect(() => {
    formLoadTime.current = Date.now()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Bot protection: Check honeypot field
    if (honeypot) {
      setLoading(false)
      return
    }

    // Bot protection: Check form fill time (minimum 2 seconds)
    const fillTime = Date.now() - formLoadTime.current
    if (fillTime < 2000) {
      setError(t('forgotPassword', 'pleaseWait'))
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
      } else {
        setError(data.message || t('forgotPassword', 'errorOccurred'))
      }
    } catch {
      setError(t('forgotPassword', 'errorOccurred'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-16">
        <div className="w-full max-w-md px-4">
          <div className="bg-white dark:bg-surface-raised rounded-lg shadow-md p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-ink dark:text-surface-text mb-4">
                {t('forgotPassword', 'checkYourEmail')}
              </h1>
              <p className="text-neutral-600 dark:text-neutral-300 mb-6">
                {t('forgotPassword', 'emailSentTo')} <strong>{email}</strong>. {t('forgotPassword', 'checkInbox')}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                {t('forgotPassword', 'didntReceive')}
              </p>
              <Link
                href="/login"
                className="inline-block bg-brand text-white px-6 py-3 rounded-lg hover:bg-brand-dark transition-colors font-semibold"
              >
                {t('forgotPassword', 'backToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-16">
      <div className="w-full max-w-md px-4">
        <div className="bg-white dark:bg-surface-raised rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-ink dark:text-surface-text text-center mb-2">
            {t('forgotPassword', 'title')}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300 text-center mb-6">
            {t('forgotPassword', 'description')}
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('forgotPassword', 'emailAddress')}
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                required
                placeholder={t('forgotPassword', 'emailPlaceholder')}
              />
            </div>

            {/* Honeypot field - hidden from users but visible to bots */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              autoComplete="off"
              tabIndex={-1}
              className="absolute left-[-9999px] w-1 h-1 opacity-0"
              aria-hidden="true"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white py-3 rounded-lg hover:bg-brand-dark transition-colors font-semibold disabled:opacity-50"
            >
              {loading ? t('common', 'sending') : t('forgotPassword', 'sendResetLink')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            {t('forgotPassword', 'rememberPassword')}{' '}
            <Link href="/login" className="text-brand hover:underline">
              {t('forgotPassword', 'backToLogin')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
