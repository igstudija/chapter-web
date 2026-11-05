import type { Payload } from 'payload'
import type { Event } from '@/payload-types'

/**
 * "Come as a guest" — the one action a networking chapter's website exists
 * for — resolves to the next meeting a signed-out visitor may register for.
 *
 * The guest form lives on each event page, so there is no single URL for it.
 * Pointing buttons at a specific event goes stale a week later; pointing them
 * at /viesis, which looks the event up on every request, does not.
 */

/** Element id the registration form sits under on an event page. */
export const GUEST_REGISTRATION_ANCHOR = 'registracija'

/** Stable path every guest call to action links to. */
export const GUEST_PATH = '/viesis'

/** The next published, public event that has not started yet. */
export async function findNextPublicEvent(payload: Payload): Promise<Event | null> {
  const result = await payload.find({
    collection: 'events',
    where: {
      and: [
        { _status: { equals: 'published' } },
        { isPublic: { equals: true } },
        { date: { greater_than_equal: new Date().toISOString() } },
      ],
    },
    sort: 'date',
    limit: 1,
    depth: 0,
  })
  return result.docs[0] ?? null
}

/** Where a guest registers for `event`, or the events list when there is none. */
export function guestRegistrationPath(event: Pick<Event, 'slug'> | null | undefined): string {
  return event?.slug ? `/events/${event.slug}#${GUEST_REGISTRATION_ANCHOR}` : '/events'
}

/**
 * "trešdien, 11. novembrī, 06:45" — the next meeting in the chapter's language
 * and timezone, so a visitor reads it the way the chapter says it.
 */
export function formatMeetingDate(
  date: string | Date,
  locale: string,
  timeZone = 'Europe/Riga',
): string {
  const parsed = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  const intlLocale = locale === 'lv' ? 'lv-LV' : locale === 'lt' ? 'lt-LT' : 'en-GB'
  const day = new Intl.DateTimeFormat(intlLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(parsed)
  const time = new Intl.DateTimeFormat(intlLocale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(parsed)
  return `${day}, ${time}`
}
