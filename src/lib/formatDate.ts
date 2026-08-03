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
