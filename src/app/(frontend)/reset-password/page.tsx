'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from '@/components'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslations()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setError(t('resetPassword', 'invalidToken'))
    }
  }, [token, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('resetPassword', 'passwordsNotMatch'))
      return
    }

    if (password.length < 8) {
      setError(t('resetPassword', 'passwordTooShort'))
      return
    }

    if (!token) {
      setError(t('resetPassword', 'invalidToken'))
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setError(data.message || t('resetPassword', 'resetFailed'))
      }
    } catch {
      setError(t('login', 'errorOccurred'))
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
                {t('resetPassword', 'resetSuccess')}
              </h1>
              <p className="text-neutral-600 dark:text-neutral-300 mb-6">
                {t('resetPassword', 'resetSuccessDescription')}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                {t('resetPassword', 'redirecting')}
              </p>
              <Link
                href="/login"
                className="inline-block bg-brand text-white px-6 py-3 rounded-lg hover:bg-brand-dark transition-colors font-semibold"
              >
                {t('resetPassword', 'goToLogin')}
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
            {t('resetPassword', 'title')}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300 text-center mb-6">
            {t('resetPassword', 'description')}
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('resetPassword', 'newPassword')}
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
                required
                minLength={8}
                placeholder={t('resetPassword', 'newPasswordPlaceholder')}
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {t('resetPassword', 'passwordRequirement')}
              </p>
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('resetPassword', 'confirmPassword')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="field"
                required
                minLength={8}
                placeholder={t('resetPassword', 'confirmPasswordPlaceholder')}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !token}
              className="w-full bg-brand text-white py-3 rounded-lg hover:bg-brand-dark transition-colors font-semibold disabled:opacity-50"
            >
              {loading ? t('resetPassword', 'resetting') : t('resetPassword', 'title')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <Link href="/login" className="text-brand hover:underline">
              {t('forgotPassword', 'backToLogin')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center py-16">
          <div className="text-neutral-600 dark:text-neutral-300">Loading...</div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
