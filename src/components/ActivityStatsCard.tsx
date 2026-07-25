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

  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 shadow-sm">
      <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-ink dark:text-surface-text">{formattedValue}</div>
    </div>
  )
}
