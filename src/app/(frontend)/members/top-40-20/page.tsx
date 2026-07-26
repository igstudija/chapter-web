import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { PageHeader } from '@/components'
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
      where: {},
      limit: 0,
      sort: '-createdAt',
      depth: 1,
    }),
    payload.find({
      collection: 'top20',
      where: {},
      limit: 0,
      sort: '-createdAt',
      depth: 1,
    }),
  ])

  return (
    <div className="min-h-screen bg-paper dark:bg-surface">
      <PageHeader
        title={t('top40Page', 'combinedTitle')}
        breadcrumbs={[
          { label: t('common', 'home'), href: '/' },
          { label: t('nav', 'top4020') },
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

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
