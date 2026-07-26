'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from '@/components'

type LoginMode = 'password' | 'magic-link'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslations()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginMode, setLoginMode] = useState<LoginMode>('password')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        invalid_token: t('login', 'invalidOrExpiredLink'),
        expired_token: t('login', 'linkExpired'),
        account_blocked: t('login', 'accountBlocked'),
        auth_failed: t('login', 'authFailed'),
        verification_failed: t('login', 'verificationFailed'),
      }
      setError(errorMessages[errorParam] || t('login', 'errorOccurred'))
    }
  }, [searchParams, t])

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (honeypot) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        // Keep loading=true until redirect completes (component unmounts)
        router.push('/my-profile')
        router.refresh()
        return
      }

      // Only set loading=false on error
      setLoading(false)

      // Always use translated message for invalid credentials (401)
      // Payload returns English error message, we use our translation instead
      if (res.status === 401) {
        setError(t('login', 'invalidCredentials'))
      } else {
        const data = await res.json()
        setError(data.errors?.[0]?.message || t('login', 'invalidCredentials'))
      }
    } catch {
      setLoading(false)
      setError(t('login', 'errorOccurred'))
    }
  }

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (honeypot) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/users/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setMagicLinkSent(true)
      } else {
        const data = await res.json()
        setError(data.message || t('login', 'errorOccurred'))
      }
    } catch {
      setError(t('login', 'errorOccurred'))
    } finally {
      setLoading(false)
    }
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-16">
        <div className="w-full max-w-md px-4">
          <div className="panel p-8 md:p-10">
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="display-2 mb-4 text-ink dark:text-surface-text">
                {t('login', 'checkYourEmail')}
              </h1>
              <p className="text-neutral-600 dark:text-neutral-300 mb-6">
                {t('login', 'emailSentTo')} <strong>{email}</strong>.{' '}
                {t('login', 'clickLinkToSignIn')}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                {t('login', 'linkExpires')}
              </p>
              <button
                onClick={() => {
                  setMagicLinkSent(false)
                  setEmail('')
                }}
                className="text-brand hover:underline font-medium"
              >
                {t('login', 'tryDifferentEmail')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-16">
      <div className="w-full max-w-md px-4">
        <div className="panel p-8 md:p-10">
          <h1 className="display-2 mb-8 text-center text-ink dark:text-surface-text">
            {t('login', 'memberLogin')}
          </h1>

          {error && (
            <div className="mb-5 rounded-lg border border-rose-600/25 bg-rose-500/10 p-3.5 text-sm text-rose-800 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="mb-7 flex gap-1 rounded-xl border border-line bg-neutral-100 p-1 dark:border-line-dark dark:bg-surface">
            <button
              type="button"
              onClick={() => setLoginMode('password')}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                loginMode === 'password'
                  ? 'bg-white dark:bg-surface-raised text-ink dark:text-surface-text shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              {t('login', 'password')}
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('magic-link')}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                loginMode === 'magic-link'
                  ? 'bg-white dark:bg-surface-raised text-ink dark:text-surface-text shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              {t('login', 'emailLink')}
            </button>
          </div>

          {loginMode === 'password' ? (
            <form onSubmit={handlePasswordLogin} action="#" className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="field-label"
                >
                  {t('login', 'email')}
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  className="field"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="field-label"
                >
                  {t('login', 'password')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 focus:outline-none"
                    aria-label={showPassword ? 'Slēpt paroli' : 'Rādīt paroli'}
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="text-right mt-1">
                  <Link href="/forgot-password" className="text-sm text-brand hover:underline">
                    {t('login', 'forgotPassword')}
                  </Link>
                </div>
              </div>

              {/* Honeypot field - no name attribute to prevent URL params */}
              <input
                type="text"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                autoComplete="off"
                tabIndex={-1}
                className="absolute left-[-9999px] w-1 h-1 opacity-0"
                aria-hidden="true"
              />

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 appearance-none bg-white dark:bg-neutral-600 border border-neutral-300 dark:border-neutral-500 rounded cursor-pointer checked:bg-brand checked:border-brand checked:bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')]"
                />
                <label htmlFor="terms" className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t('login', 'agreeToTerms')}{' '}
                  <Link href="/terms-and-conditions" className="text-brand hover:underline">
                    {t('login', 'termsAndPrivacy')}
                  </Link>{' '}
                  {t('login', 'and')}{' '}
                  <Link href="/privacy-policy" className="text-brand hover:underline">
                    {t('login', 'privacyPolicy')}
                  </Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !agreedToTerms}
                className="btn btn-primary w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? t('common', 'loading') : t('login', 'signIn')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMagicLinkRequest} action="#" className="space-y-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
                {t('login', 'emailLinkDescription')}
              </p>
              <div>
                <label
                  htmlFor="magic-email"
                  className="field-label"
                >
                  {t('login', 'email')}
                </label>
                <input
                  type="email"
                  id="magic-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  className="field"
                  required
                  placeholder={t('forgotPassword', 'emailPlaceholder')}
                />
              </div>

              {/* Honeypot field - no name attribute to prevent URL params */}
              <input
                type="text"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                autoComplete="off"
                tabIndex={-1}
                className="absolute left-[-9999px] w-1 h-1 opacity-0"
                aria-hidden="true"
              />

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms-magic"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 appearance-none bg-white dark:bg-neutral-600 border border-neutral-300 dark:border-neutral-500 rounded cursor-pointer checked:bg-brand checked:border-brand checked:bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')]"
                />
                <label htmlFor="terms-magic" className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t('login', 'agreeToTerms')}{' '}
                  <Link href="/terms-and-conditions" className="text-brand hover:underline">
                    {t('login', 'termsAndPrivacy')}
                  </Link>{' '}
                  {t('login', 'and')}{' '}
                  <Link href="/privacy-policy" className="text-brand hover:underline">
                    {t('login', 'privacyPolicy')}
                  </Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !agreedToTerms}
                className="btn btn-primary w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? t('common', 'sending') : t('login', 'sendLoginLink')}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <Link href="/" className="text-brand hover:underline">
              {t('common', 'backToHome')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center py-16">
          <div className="w-full max-w-md px-4">
            <div className="panel p-8 md:p-10">
              <div className="text-center">
                <div className="animate-pulse">
                  <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-48 mx-auto mb-6"></div>
                  <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded mb-4"></div>
                  <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded mb-4"></div>
                  <div className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
