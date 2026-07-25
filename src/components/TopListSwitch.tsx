'use client'

import { useState } from 'react'
import { Top40Grid } from './Top40Grid'

// The grid accepts the raw Payload docs; keep the prop loose to avoid coupling
// to its internal entry type.
interface TopListSwitchProps {
  top40Entries: any[]
  top20Entries: any[]
  top40Label: string
  top20Label: string
}

export function TopListSwitch({
  top40Entries,
  top20Entries,
  top40Label,
  top20Label,
}: TopListSwitchProps) {
  const [active, setActive] = useState<'top40' | 'top20'>('top40')
  const entries = active === 'top40' ? top40Entries : top20Entries

  const pill = (key: 'top40' | 'top20', label: string, count: number) => (
    <button
      type="button"
      onClick={() => setActive(key)}
      className={`flex items-center gap-2 px-5 h-11 rounded-lg font-semibold transition-colors ${
        active === key
          ? 'bg-brand text-white'
          : 'bg-white dark:bg-neutral-800 text-ink dark:text-surface-text border border-neutral-300 dark:border-neutral-600 hover:border-brand'
      }`}
    >
      <span>{label}</span>
      <span
        className={`text-sm font-bold ${active === key ? 'text-white/90' : 'text-brand'}`}
      >
        Σ{count}
      </span>
    </button>
  )

  return (
    <div>
      <div className="flex gap-3 mb-6">
        {pill('top40', top40Label, top40Entries.length)}
        {pill('top20', top20Label, top20Entries.length)}
      </div>

      {/* key forces Top40Grid to reset its internal search/pagination on switch */}
      <Top40Grid key={active} entries={entries} />
    </div>
  )
}
