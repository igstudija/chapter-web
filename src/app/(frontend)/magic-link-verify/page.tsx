'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from '@/components'

function MagicLinkVerifyContent() {
  const searchParams = useSearchParams()
  const { t } = useTranslations()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setErrorMessage(t('magicLink', 'invalidToken'))
      return
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/users/magic-link/verify?token=${token}`)
        const data = await res.json()

        if (data.success) {
          setStatus('success')
          // Redirect after short delay to show success message
          setTimeout(() => {
            window.location.href = '/my-profile'
          }, 1000)
        } else {
          setStatus('error')
          setErrorMessage(data.message || t('magicLink', 'errorOccurred'))
        }
      } catch {
        setStatus('error')
        setErrorMessage(t('magicLink', 'errorOccurred'))
      }
    }

    verifyToken()
  }, [searchParams, t])

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-16">
      <div className="w-full max-w-md px-4">
        <div className="bg-white dark:bg-surface-raised rounded-lg shadow-md p-8">
          <div className="text-center">
            {status === 'verifying' && (
              <>
                <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-brand animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-ink dark:text-surface-text mb-4">
                  {t('magicLink', 'signingIn')}
                </h1>
                <p className="text-neutral-600 dark:text-neutral-300">
                  {t('magicLink', 'pleaseWait')}
                </p>
              </>
            )}

            {status === 'success' && (
              <>
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
                  {t('magicLink', 'success')}
                </h1>
                <p className="text-neutral-600 dark:text-neutral-300">
                  {t('magicLink', 'redirecting')}
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-ink dark:text-surface-text mb-4">
                  {t('magicLink', 'verificationFailed')}
                </h1>
                <p className="text-neutral-600 dark:text-neutral-300 mb-6">{errorMessage}</p>
                <Link
                  href="/login"
                  className="inline-block bg-brand text-white px-6 py-3 rounded-lg hover:bg-brand-dark transition-colors font-semibold"
                >
                  {t('forgotPassword', 'backToLogin')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MagicLinkVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center py-16">
          <div className="w-full max-w-md px-4">
            <div className="bg-white dark:bg-surface-raised rounded-lg shadow-md p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-brand animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-ink dark:text-surface-text mb-4">
                  Loading...
                </h1>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <MagicLinkVerifyContent />
    </Suspense>
  )
}
