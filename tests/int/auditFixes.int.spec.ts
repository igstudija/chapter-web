import { describe, expect, it, afterEach } from 'vitest'
import { iconPath, parseIconName } from '@/lib/iconPath'
import {
  generateEventSchema,
  generateMetadata,
  generateOrganizationSchema,
  isOnlineLocation,
  ogLocale,
  orgNameFrom,
  plainTextFrom,
  siteOrigin,
} from '@/lib/seoHelpers'
import { decodeEmail, encodeEmail } from '@/lib/emailObfuscation'
import { formatDateDotted } from '@/lib/formatDate'
import { formatMeetingDate, guestRegistrationPath } from '@/lib/nextMeeting'
import { Users } from '@/collections/Users'

describe('stat icons', () => {
  it('turns an Iconify name into a same-origin path in the form Iconify answers', () => {
    // The colon form went to api.iconify.design as-is and 404ed.
    expect(iconPath('solar:calendar-bold-duotone', 'mdi:chart-line')).toBe(
      '/icons/solar/calendar-bold-duotone.svg',
    )
    expect(iconPath('mdi/handshake', 'mdi:chart-line')).toBe('/icons/mdi/handshake.svg')
  })

  it('falls back when the CMS value is empty or not an icon name', () => {
    expect(iconPath('', 'mdi:chart-line')).toBe('/icons/mdi/chart-line.svg')
    expect(iconPath('../../etc/passwd', 'mdi:chart-line')).toBe('/icons/mdi/chart-line.svg')
    expect(parseIconName('https://evil.example/x')).toBeNull()
  })
})

describe('organisation name', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME
  afterEach(() => {
    process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME = ORIGINAL
  })

  it('reads siteName from the Settings document itself', () => {
    expect(orgNameFrom({ siteName: 'BNI Vivaldi' })).toBe('BNI Vivaldi')
  })

  it('never prefers the creation placeholder over the fallback', () => {
    expect(orgNameFrom({ siteName: 'Your Organisation' })).not.toBe('')
  })

  it('reaches titles, og:site_name and og:locale', () => {
    const meta = generateMetadata({
      contentTitle: 'Kontakti',
      siteSettings: { locale: 'lv' } as never,
      siteBranding: { siteName: 'BNI Vivaldi' },
      baseUrl: 'https://bnivivaldi.lv',
      pathname: '/contacts',
    })
    expect(meta.openGraph).toMatchObject({ siteName: 'BNI Vivaldi', locale: 'lv_LV' })
    expect(meta.alternates?.canonical).toBe('https://bnivivaldi.lv/contacts')
  })

  it('emits an Organization schema with social profiles as sameAs', () => {
    const schema = generateOrganizationSchema({
      siteSettings: {
        socialMedia: {
          facebook: 'https://www.facebook.com/BNIVivaldiRiga',
          instagram: 'https://www.instagram.com/bnivivaldi',
        },
      } as never,
      siteBranding: { siteName: 'BNI Vivaldi' },
      baseUrl: 'https://bnivivaldi.lv',
    }) as Record<string, unknown>
    expect(schema).toMatchObject({ '@type': 'Organization', name: 'BNI Vivaldi' })
    expect(schema.sameAs).toEqual([
      'https://www.facebook.com/BNIVivaldiRiga',
      'https://www.instagram.com/bnivivaldi',
    ])
  })
})

describe('og:locale and origin', () => {
  it('maps interface languages', () => {
    expect(ogLocale('lv')).toBe('lv_LV')
    expect(ogLocale('en')).toBe('en_GB')
    expect(ogLocale(undefined)).toBe('lv_LV')
  })

  it('takes the origin from NEXT_PUBLIC_SERVER_URL', () => {
    const before = process.env.NEXT_PUBLIC_SERVER_URL
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://bnivivaldi.lv/'
    expect(siteOrigin()).toBe('https://bnivivaldi.lv')
    process.env.NEXT_PUBLIC_SERVER_URL = 'not a url'
    expect(siteOrigin()).toBeNull()
    process.env.NEXT_PUBLIC_SERVER_URL = before
  })
})

describe('event structured data', () => {
  it('strips CMS HTML out of the description', () => {
    expect(plainTextFrom('<p>Brokastis&nbsp;un <strong>tīklošanās</strong></p><p>6:45</p>')).toBe(
      'Brokastis un tīklošanās 6:45',
    )
  })

  it('cuts long text at a word boundary', () => {
    const text = plainTextFrom(`<p>${'vārds '.repeat(100)}</p>`, 50)
    expect(text.length).toBeLessThanOrEqual(50)
    expect(text.endsWith('…')).toBe(true)
  })

  it('tells a Zoom meeting from an in-person one', () => {
    expect(isOnlineLocation('Zoom')).toBe(true)
    expect(isOnlineLocation('Tiešsaistē')).toBe(true)
    expect(isOnlineLocation('Aston viesnīca, Brīvības iela 48/50')).toBe(false)
  })

  it('carries what Google asks for on an online event', () => {
    const schema = generateEventSchema({
      name: 'Biznesa brokastis',
      description: '<p>Nāc!</p>',
      baseUrl: 'https://bnivivaldi.lv',
      pathname: '/events/x',
      startDate: '2026-11-11T04:45:00.000Z',
      location: 'Zoom',
      organizerName: 'BNI Vivaldi',
    }) as Record<string, any>
    expect(schema.description).toBe('Nāc!')
    expect(schema.eventStatus).toBe('https://schema.org/EventScheduled')
    expect(schema.eventAttendanceMode).toBe('https://schema.org/OnlineEventAttendanceMode')
    expect(schema.location).toEqual({ '@type': 'VirtualLocation', url: 'https://bnivivaldi.lv/events/x' })
    expect(schema.organizer).toMatchObject({ name: 'BNI Vivaldi' })
  })

  it('gives an in-person event a Place with an address', () => {
    const schema = generateEventSchema({
      name: 'Klātienes tikšanās',
      baseUrl: 'https://bnivivaldi.lv',
      location: 'Aston viesnīca, Brīvības iela 48/50, Rīga',
    }) as Record<string, any>
    expect(schema.eventAttendanceMode).toBe('https://schema.org/OfflineEventAttendanceMode')
    expect(schema.location.address).toBe('Aston viesnīca, Brīvības iela 48/50, Rīga')
  })
})

describe('guest registration', () => {
  it('links to the form on the next event, or the event list without one', () => {
    expect(guestRegistrationPath({ slug: 'rits' })).toBe('/events/rits#registracija')
    expect(guestRegistrationPath(null)).toBe('/events')
  })

  it('states the meeting time in the chapter timezone', () => {
    // 04:45 UTC on 11 Nov 2026 is 06:45 in Riga (EET, UTC+2).
    expect(formatMeetingDate('2026-11-11T04:45:00.000Z', 'lv')).toMatch(/11\. novembr.*06:45$/)
  })
})

describe('dates and addresses', () => {
  it('formats blog dates the way event cards do', () => {
    expect(formatDateDotted('2025-12-24T10:00:00.000Z')).toBe('24.12.2025')
    // Just after midnight in Riga is still that day in Riga.
    expect(formatDateDotted('2025-12-23T22:30:00.000Z')).toBe('24.12.2025')
  })

  it('round-trips an address without leaving it readable in the markup', () => {
    const encoded = encodeEmail('vārds@bnivivaldi.lv')
    expect(encoded).not.toContain('@')
    expect(encoded).not.toContain('bnivivaldi')
    expect(decodeEmail(encoded)).toBe('vārds@bnivivaldi.lv')
    expect(encodeEmail('')).toBe('')
  })
})

describe('user tokens', () => {
  it('are hidden fields, not merely hidden from the admin form', () => {
    // admin.hidden only hides a field in the edit view; the API and every page
    // that reads a user still returned the token.
    const byName = new Map(
      Users.fields.filter((f) => 'name' in f).map((f) => [(f as { name: string }).name, f]),
    )
    for (const name of [
      'magicLinkToken',
      'magicLinkExpiry',
      'customResetToken',
      'customResetExpiry',
      'emailChangeToken',
      'emailChangeExpiry',
    ]) {
      expect((byName.get(name) as { hidden?: boolean } | undefined)?.hidden, name).toBe(true)
    }
  })
})
