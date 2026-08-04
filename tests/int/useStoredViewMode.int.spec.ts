// @vitest-environment jsdom
import React from 'react'
import { render, act, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useStoredViewMode, type ViewMode } from '@/components/useStoredViewMode'

afterEach(cleanup)
beforeEach(() => localStorage.clear())

/**
 * Renders the hook and records what it returned on every paint. The first entry
 * is the one that has to match what the server produced.
 */
function renderHook(key: string) {
  const paints: ViewMode[] = []
  let setMode: (mode: ViewMode) => void = () => {}

  const Probe = () => {
    const [mode, set] = useStoredViewMode(key)
    paints.push(mode)
    setMode = set
    return null
  }

  render(React.createElement(Probe))

  return { paints, choose: (mode: ViewMode) => act(() => setMode(mode)) }
}

describe('useStoredViewMode', () => {
  it('paints grid first even when table was saved', () => {
    // The hydration bug this exists to prevent: the server cannot read
    // localStorage, so anything but 'grid' on the first paint is a mismatch
    // React reports on every data-active attribute.
    localStorage.setItem('k', 'table')

    const { paints } = renderHook('k')

    expect(paints[0]).toBe('grid')
    expect(paints.at(-1)).toBe('table')
  })

  it('leaves the saved value alone until it has been read', () => {
    // Writing from an effect on the value would fire once on mount and
    // overwrite the preference with the default before it had been read.
    localStorage.setItem('k', 'table')

    renderHook('k')

    expect(localStorage.getItem('k')).toBe('table')
  })

  it('persists a choice as it is made', () => {
    const { choose } = renderHook('k')

    choose('table')

    expect(localStorage.getItem('k')).toBe('table')
  })

  it('ignores a stored value that is not a view mode', () => {
    localStorage.setItem('k', 'carousel')

    expect(renderHook('k').paints.at(-1)).toBe('grid')
  })

  it('keeps separate keys separate', () => {
    localStorage.setItem('top20', 'table')

    expect(renderHook('top40').paints.at(-1)).toBe('grid')
    expect(renderHook('top20').paints.at(-1)).toBe('table')
  })
})
