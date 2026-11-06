import type { Payload } from 'payload'
import type { Event } from '@/payload-types'

/**
 * "Come as a guest" — the one action a networking chapter's website exists
 * for — resolves to the next meeting a signed-out visitor may register for.
 *
 * The guest form lives on each event page, so there is no single URL for it.
 * Pointing buttons at a specific event goes stale a week later; pointing them
 * at /viesis (or /guest), which looks the event up on every request, does not.
 */

/** Element id the registration form sits under on an event page. */
export const GUEST_REGISTRATION_ANCHOR = 'registracija'

/**
 * Stable short links every guest call to action points at — one per site
 * language, and both answer on every install, so a QR code printed for one
 * language keeps working if the site's language changes.
 */
export const GUEST_PATHS = { lv: '/viesis', en: '/guest' } as const

/** The guest link in the site's language. */
export function guestPathFor(locale: string | null | undefined): string {
  return locale === 'lv' ? GUEST_PATHS.lv : GUEST_PATHS.en
}

/** Whether a link from the CMS already is the guest link, in either language. */
export function isGuestPath(href: string | null | undefined): boolean {
  return Boolean(href) && (Object.values(GUEST_PATHS) as string[]).includes(href as string)
}

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

/**
 * The response behind both guest short links: a redirect to the next public
 * meeting's registration form, or to the events list when none is scheduled.
 * 307 rather than 308, because where it lands changes every week.
 */
export async function redirectToNextMeeting(payload: Payload, requestUrl: string): Promise<Response> {
  const event = await findNextPublicEvent(payload)
  return Response.redirect(new URL(guestRegistrationPath(event), requestUrl), 307)
}
