'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A swatch that opens its own panel: presets to click, a hex field to type.
 *
 * The browser's native colour input was doing both jobs badly here — it hands
 * off to an operating-system dialog full of RGB sliders nobody presenting a
 * slide needs, and the hex field had to live outside it as a second control.
 * Keeping both in one panel means one thing to click and one place to look.
 */

/**
 * Ten hues across five shades, over a row of neutrals. Enough range to match a
 * brand without turning the panel into a colour-theory exercise; anything the
 * grid misses goes in as a hex code below it.
 */
const PRESET_COLUMNS = 10

const PRESETS = [
  // Neutrals, white through black.
  '#ffffff', '#fafaf9', '#f5f5f4', '#e7e5e4', '#d6d3d1',
  '#a8a29e', '#78716c', '#44403c', '#1c1917', '#000000',
  // Lightest shade of each hue.
  '#e2e8f0', '#fecaca', '#fed7aa', '#fde68a', '#bbf7d0',
  '#99f6e4', '#bae6fd', '#bfdbfe', '#ddd6fe', '#fbcfe8',
  '#94a3b8', '#f87171', '#fb923c', '#fbbf24', '#4ade80',
  '#2dd4bf', '#38bdf8', '#60a5fa', '#a78bfa', '#f472b6',
  '#475569', '#dc2626', '#ea580c', '#d97706', '#16a34a',
  '#0d9488', '#0284c7', '#2563eb', '#7c3aed', '#db2777',
  '#1e293b', '#991b1b', '#9a3412', '#92400e', '#166534',
  '#115e59', '#075985', '#1e40af', '#5b21b6', '#9d174d',
  // Darkest shade of each hue.
  '#020617', '#450a0a', '#431407', '#451a03', '#052e16',
  '#042f2e', '#082f49', '#172554', '#2e1065', '#500724',
]

const FULL_HEX = /^#[0-9a-fA-F]{6}$/
const PARTIAL_HEX = /^#[0-9a-fA-F]{0,6}$/

export function ColorPicker({
  value,
  onChange,
  title,
}: {
  readonly value: string
  readonly onChange: (color: string) => void
  readonly title?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const rootRef = useRef<HTMLDivElement>(null)

  // Keep the field in step when the colour changes from somewhere else.
  useEffect(() => {
    if (!open) setDraft(value)
  }, [value, open])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const commit = (next: string) => {
    setDraft(next)
    if (FULL_HEX.test(next)) onChange(next.toLowerCase())
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={title || value}
        className="flex h-12 w-12 items-center justify-center rounded-lg border border-neutral-300 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-700"
      >
        <span
          className="block h-6 w-6 rounded border border-neutral-300 dark:border-neutral-500"
          style={{ backgroundColor: value }}
        />
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-14 z-50 rounded-xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
          // Never wider than the screen it opens on; the swatch grid shrinks
          // with it rather than running off the edge of a phone.
          style={{ width: 'min(340px, calc(100vw - 2rem))' }}
        >
          <div
            className="grid gap-[6px]"
            style={{ gridTemplateColumns: `repeat(${PRESET_COLUMNS}, minmax(0, 1fr))` }}
          >
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setDraft(preset)
                  onChange(preset)
                }}
                title={preset}
                aria-label={preset}
                className={`aspect-square w-full rounded transition-transform hover:scale-110 ${
                  preset.toLowerCase() === value.toLowerCase()
                    ? 'ring-2 ring-red-600 ring-offset-1 dark:ring-offset-neutral-800'
                    : 'ring-1 ring-black/10 dark:ring-white/15'
                }`}
                style={{ backgroundColor: preset }}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span
              className="h-10 w-10 shrink-0 rounded-md border border-neutral-300 dark:border-neutral-600"
              style={{ backgroundColor: FULL_HEX.test(draft) ? draft : value }}
            />
            <input
              type="text"
              value={draft}
              onChange={(event) => {
                const next = event.target.value
                if (next === '' || PARTIAL_HEX.test(next)) commit(next)
              }}
              onBlur={() => {
                // Abandon a half-typed code rather than leaving the field wrong.
                if (!FULL_HEX.test(draft)) setDraft(value)
              }}
              spellCheck={false}
              autoComplete="off"
              placeholder="#ffffff"
              maxLength={7}
              className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 font-mono text-sm text-neutral-900 dark:border-neutral-600 dark:bg-surface dark:text-surface-text"
            />
          </div>
        </div>
      )}
    </div>
  )
}
