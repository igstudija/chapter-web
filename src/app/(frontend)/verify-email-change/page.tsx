import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getCurrentSite } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { CheckCircle2, XCircle } from 'lucide-react'

export const metadata = {
  title: 'Verify Email Change',
  description: 'Verify your new email address.',
}

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyEmailChangePage({ searchParams }: PageProps) {
  const { token } = await searchParams

  const currentSite = await getCurrentSite()
  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  if (!token) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-surface flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-surface-raised rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-ink dark:text-surface-text mb-2">
            {t('profile', 'invalidToken')}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {t('profile', 'tokenMissing')}
          </p>
          <Link
            href="/my-profile"
            className="inline-block bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand-dark transition-colors"
          >
            {t('profile', 'backToProfile')}
          </Link>
        </div>
      </div>
    )
  }

  const payload = await getPayload({ config })

  // Find user with this token
  const users = await payload.find({
    collection: 'users',
    where: {
      emailChangeToken: { equals: token },
    },
    limit: 1,
  })

  if (users.docs.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-surface flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-surface-raised rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-ink dark:text-surface-text mb-2">
            {t('profile', 'invalidToken')}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {t('profile', 'tokenInvalidOrExpired')}
          </p>
          <Link
            href="/my-profile"
            className="inline-block bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand-dark transition-colors"
          >
            {t('profile', 'backToProfile')}
          </Link>
        </div>
      </div>
    )
  }

  const user = users.docs[0]

  // Check if token has expired
  if (!user.emailChangeExpiry || new Date(user.emailChangeExpiry) < new Date()) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-surface flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-surface-raised rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-ink dark:text-surface-text mb-2">
            {t('profile', 'tokenExpired')}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {t('profile', 'tokenExpiredDescription')}
          </p>
          <Link
            href="/my-profile"
            className="inline-block bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand-dark transition-colors"
          >
            {t('profile', 'backToProfile')}
          </Link>
        </div>
      </div>
    )
  }

  // Check if pending email exists
  if (!user.pendingEmail) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-surface flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-surface-raised rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-ink dark:text-surface-text mb-2">
            {t('profile', 'noPendingEmail')}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {t('profile', 'noPendingEmailDescription')}
          </p>
          <Link
            href="/my-profile"
            className="inline-block bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand-dark transition-colors"
          >
            {t('profile', 'backToProfile')}
          </Link>
        </div>
      </div>
    )
  }

  const newEmail = user.pendingEmail

  // Update email and clear pending fields
  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      email: newEmail,
      pendingEmail: null,
      emailChangeToken: null,
      emailChangeExpiry: null,
    },
    overrideAccess: true,
  })

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-surface flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-surface-raised rounded-lg shadow-lg p-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-ink dark:text-surface-text mb-2">
          {t('profile', 'emailChangedSuccess')}
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-2">
          {t('profile', 'newEmailIs')}:
        </p>
        <p className="text-lg font-semibold text-ink dark:text-surface-text mb-6">
          {newEmail}
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
          {t('profile', 'useNewEmailToLogin')}
        </p>
        <Link
          href="/login"
          className="inline-block bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand-dark transition-colors"
        >
          {t('login', 'signIn')}
        </Link>
      </div>
    </div>
  )
}
