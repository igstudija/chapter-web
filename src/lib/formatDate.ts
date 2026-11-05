/**
 * Dates that a server component renders and a client component re-renders have
 * to agree, character for character, or React throws away the server HTML and
 * warns about a hydration mismatch. `toLocaleDateString()` with no arguments
 * cannot agree: Node picks its own ICU default (`7/22/2026`) while the browser
 * picks the visitor's (`22/07/2026`), so the same date renders two ways.
 *
 * Both arguments here are the fix. The locale is pinned so neither side reads
 * an ambient one, and the timezone is pinned to UTC because the stored value is
 * UTC — without it a visitor east of Greenwich can be shown tomorrow's date.
 */
const SHORT_DATE = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

/** `22/07/2026`. Same output on the server and in every browser. */
export function formatDateShort(date: string | number | Date): string {
  const parsed = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  return SHORT_DATE.format(parsed)
}

const DOTTED_PARTS = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Riga',
})

/**
 * `24.12.2025` — the dotted form the event cards use, so a blog card beside
 * them does not say `12/24/2025`. Pinned to the chapter's timezone rather than
 * UTC: a post published at 00:30 Riga time is that day's post, not the day
 * before's.
 */
export function formatDateDotted(date: string | number | Date): string {
  const parsed = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  const parts = Object.fromEntries(
    DOTTED_PARTS.formatToParts(parsed).map((p) => [p.type, p.value]),
  ) as Record<string, string>
  return `${parts.day}.${parts.month}.${parts.year}`
}
