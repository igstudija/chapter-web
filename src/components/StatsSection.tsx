'use client'

import { useTranslations } from './TranslationsProvider'

interface Stat {
  value: string
  labelKey: string
}

const stats: Stat[] = [
  { value: '€34,287,788', labelKey: 'statsTotalBusiness' },
  { value: '€2,400,370', labelKey: 'statsThisYear' },
  { value: '€74,000', labelKey: 'statsAvgPerMember' },
  { value: '100', labelKey: 'statsMembers' },
]

export function StatsSection() {
  const { t } = useTranslations()

  return (
    <section className="bg-brand py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          {t('home', 'statsTitle')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {stats.map((stat) => (
            <div key={stat.labelKey} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-red-100 mt-2">
                {t('home', stat.labelKey as 'statsTotalBusiness')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
