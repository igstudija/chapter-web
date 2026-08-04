import { describe, expect, it } from 'vitest'
import { formatDateShort } from '@/lib/formatDate'

describe('formatDateShort', () => {
  it('renders the same string regardless of the ambient locale', () => {
    // The hydration bug: Node resolved the bare call against its own ICU
    // default (7/22/2026) while the browser used the visitor's (22/07/2026),
    // and React only needs the two strings to differ.
    expect(formatDateShort('2026-07-22T07:25:16.000Z')).toBe('22/07/2026')
  })

  it('reads the timestamp in UTC, not the viewer’s timezone', () => {
    // Without a pinned zone a visitor east of Greenwich is shown tomorrow's
    // date — the same defect wearing a disguise.
    expect(formatDateShort('2026-07-22T23:30:00.000Z')).toBe('22/07/2026')
    expect(formatDateShort('2026-07-22T00:30:00.000Z')).toBe('22/07/2026')
  })

  it('accepts a Date as readily as a string', () => {
    expect(formatDateShort(new Date('2026-01-05T12:00:00.000Z'))).toBe('05/01/2026')
  })

  it('renders nothing for a value that is not a date', () => {
    // Callers put this straight into JSX; "Invalid Date" on a member's card is
    // worse than an empty space.
    expect(formatDateShort('not a date')).toBe('')
  })
})
