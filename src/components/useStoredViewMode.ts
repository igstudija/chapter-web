'use client'

import { useEffect, useState } from 'react'

export type ViewMode = 'grid' | 'table'

/**
 * A grid/table preference that outlives the page, without breaking hydration.
 *
 * The obvious version — reading `localStorage` in the `useState` initialiser —
 * is wrong in a way that only shows up in the console: the server has no
 * storage, so it renders `grid`, the browser renders whatever was saved, and
 * React reports a mismatch on every `data-active` attribute. So the first paint
 * is always `grid` and the saved choice lands one effect later.
 *
 * Writing happens in `setViewMode` rather than in an effect on the value.
 * An effect would also fire once on mount, rewriting the key with the default
 * before the saved value had been read — a preference that quietly resets
 * itself under a race it does not need to be in.
 *
 * Three components carried a copy of this. They had already drifted apart:
 * different storage globals, different effect dependencies, and the key
 * declared twice as a constant and passed a third time as a literal.
 */
export function useStoredViewMode(
  storageKey: string,
): readonly [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setStoredMode] = useState<ViewMode>('grid')

  useEffect(() => {
    const saved = globalThis.localStorage?.getItem(storageKey)
    if (saved === 'table' || saved === 'grid') setStoredMode(saved)
  }, [storageKey])

  const setViewMode = (mode: ViewMode) => {
    setStoredMode(mode)
    globalThis.localStorage?.setItem(storageKey, mode)
  }

  return [viewMode, setViewMode] as const
}

/**
 * The key the public and member-facing prospect lists share.
 *
 * `Top40Grid` and `Top40Table` both read it, and `Top40Table` serves the Top 20
 * page too — so switching to the table on one of those switches all of them.
 * The profile tabs deliberately pass their own keys instead, which is why this
 * is a shared constant rather than a default baked into the hook.
 */
export const PROSPECT_VIEW_MODE_KEY = 'top40-view-mode'
