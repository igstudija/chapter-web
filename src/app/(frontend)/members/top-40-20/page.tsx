import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { TopListSwitch } from '@/components/TopListSwitch'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { getSettings } from '@/lib/getSiteSettings'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'

export const metadata = {
  title: 'Top 40 | 20 Database',
  description: 'Member prospect database.',
}

export default async function Top4020Page() {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user || !isUserActive(user as UserWithContext)) {
    redirect('/login')
  }

  const settings = await getSettings()
  if (!settings) {
    redirect('/login')
  }

  const locale = (settings?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  const [top40Data, top20Data] = await Promise.all([
    payload.find({
      collection: 'top40',
      where: { site: { equals: settings.id } },
      limit: 0,
      sort: '-createdAt',
      depth: 1,
    }),
    payload.find({
      collection: 'top20',
      where: { site: { equals: settings.id } },
      limit: 0,
      sort: '-createdAt',
      depth: 1,
    }),
  ])

  return (
    <div className="bg-neutral-50 dark:bg-surface min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm mb-6">
          <Link href="/" className="text-neutral-500 dark:text-neutral-400 hover:text-brand">
            {t('common', 'home')}
          </Link>
          <span className="mx-2 text-neutral-400 dark:text-neutral-500">›</span>
          <span className="text-ink dark:text-surface-text">{t('nav', 'top4020')}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink dark:text-surface-text">
            {t('top40Page', 'combinedTitle').toUpperCase()}
          </h1>
        </div>

        <TopListSwitch
          top40Entries={top40Data.docs}
          top20Entries={top20Data.docs}
          top40Label={t('profile', 'top40')}
          top20Label={t('profile', 'top20')}
        />
      </div>
    </div>
  )
}
