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

  // Two hand-rolled pills — one filled solid brand — sat next to the app's
  // segmented control everywhere else and read as a different kind of widget.
  // This is the same primitive, so the page has one vocabulary for "pick a view".
  const tab = (key: 'top40' | 'top20', label: string, count: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={active === key}
      onClick={() => setActive(key)}
      className="segmented-item px-4 py-2"
    >
      <span>{label}</span>
      <span className="tabular font-mono text-xs opacity-70">{count}</span>
    </button>
  )

  /*
    The switch rides in the grid's search row rather than on a line of its own:
    it scopes exactly what the field below it filters, and stacking the two
    left an empty band between the page title and the first result.
  */
  const scopeSwitch = (
    <div className="segmented" role="tablist">
      {tab('top40', top40Label, top40Entries.length)}
      {tab('top20', top20Label, top20Entries.length)}
    </div>
  )

  return (
    /* key forces Top40Grid to reset its internal search/pagination on switch */
    <Top40Grid key={active} entries={entries} leadingControls={scopeSwitch} />
  )
}
