'use client'

import { useTranslations } from './TranslationsProvider'

interface ActivityStatsCardProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
}

export function ActivityStatsCard({
  label,
  value,
  prefix = '',
  suffix = '',
}: ActivityStatsCardProps) {
  useTranslations() // Keep for potential future use

  const formattedValue = `${prefix}${value.toLocaleString('lv-LV')}${suffix}`

  /*
    Same shape as the figures on the public homepage: mono caption above, the
    number below in the display face with tabular digits so a row of these
    lines up. A member looking at their own activity should recognise the
    treatment from the chapter's public numbers — it is the same claim, scoped
    to one person.
  */
  return (
    <div className="panel rounded-xl p-5">
      <div className="eyebrow mb-3">{label}</div>
      <div className="tabular font-display text-3xl font-bold tracking-tight text-ink dark:text-surface-text">
        {formattedValue}
      </div>
    </div>
  )
}
