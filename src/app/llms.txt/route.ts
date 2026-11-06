import { getPayload } from 'payload'
import config from '@payload-config'
import slugify from 'slugify'
import { getSettings } from '@/lib/getSiteSettings'
import {
  isOnlineLocation,
  orgNameFrom,
  plainTextFrom,
  siteOrigin,
  socialProfileUrls,
} from '@/lib/seoHelpers'
import { findNextPublicEvent, formatMeetingDate, guestPathFor } from '@/lib/nextMeeting'

export const dynamic = 'force-dynamic'

const COPY = {
  lv: {
    meetings: 'Tikšanās',
    nextMeeting: 'Nākamā tikšanās',
    guest: 'Pieteikties kā viesim',
    pages: 'Galvenās lapas',
    about: 'Par mums',
    companies: 'Biedru uzņēmumi',
    events: 'Pasākumi',
    faq: 'Biežāk uzdotie jautājumi',
    contacts: 'Kontakti',
    sectors: 'Biedri pa nozarēm',
    profiles: 'Profili sociālajos tīklos',
    online: 'tiešsaistē',
  },
  en: {
    meetings: 'Meetings',
    nextMeeting: 'Next meeting',
    guest: 'Register as a guest',
    pages: 'Key pages',
    about: 'About',
    companies: 'Member companies',
    events: 'Events',
    faq: 'Frequently asked questions',
    contacts: 'Contacts',
    sectors: 'Members by sector',
    profiles: 'Social profiles',
    online: 'online',
  },
} as const

/**
 * /llms.txt — the chapter's key facts in plain Markdown, for AI assistants
 * that answer "which networking group should I join in Riga?" from what they
 * can parse and trust (https://llmstxt.org).
 *
 * Built from the same CMS records the pages use, so it cannot drift from the
 * site: name, what the group is, when and where it meets, the next meeting,
 * the members by sector, and the questions people ask.
 */
export async function GET() {
  const origin = siteOrigin()
  if (!origin || origin.includes('localhost')) {
    return new Response('Not found', { status: 404 })
  }

  const payload = await getPayload({ config })
  const [settings, about, faq, members, nextEvent] = await Promise.all([
    getSettings(),
    payload.find({ collection: 'about-us-settings', limit: 1, depth: 0 }),
    payload.find({ collection: 'faq-settings', limit: 1, depth: 0 }),
    payload.find({
      collection: 'members',
      where: { status: { equals: 'active' } },
      limit: 200,
      depth: 1,
      select: { company: true, powerGroup: true },
    }),
    findNextPublicEvent(payload),
  ])

  const locale = settings?.locale === 'en' ? 'en' : 'lv'
  const c = COPY[locale]
  const name = orgNameFrom(settings)
  const aboutDoc = about.docs[0] as Record<string, any> | undefined
  const summary =
    settings?.seo?.defaultDescription || plainTextFrom(aboutDoc?.introduction, 400) || ''

  const out: string[] = [`# ${name}`, '']
  if (summary) out.push(`> ${summary}`, '')

  const meetings = (aboutDoc?.howWeWork?.meetings ?? aboutDoc?.meetings ?? []) as Array<{
    frequency?: string
    time?: string
    location?: string
    isVirtual?: boolean
  }>
  if (meetings.length > 0 || nextEvent) {
    out.push(`## ${c.meetings}`, '')
    for (const m of meetings) {
      const parts = [m.frequency, m.time, m.location?.replace(/\s+/g, ' ')].filter(Boolean)
      if (m.isVirtual && !isOnlineLocation(m.location)) parts.push(c.online)
      if (parts.length) out.push(`- ${parts.join(', ')}`)
    }
    if (nextEvent) {
      const when = formatMeetingDate(nextEvent.date, locale, settings?.timezone || 'Europe/Riga')
      out.push(
        `- ${c.nextMeeting}: ${when}${nextEvent.location ? `, ${nextEvent.location}` : ''}`,
        `- ${c.guest}: ${origin}${guestPathFor(locale)}`,
      )
    }
    out.push('')
  }

  out.push(
    `## ${c.pages}`,
    '',
    `- [${c.about}](${origin}/about)`,
    `- [${c.companies}](${origin}/companies)`,
    `- [${c.events}](${origin}/events)`,
    `- [${c.faq}](${origin}/faq)`,
    `- [${c.contacts}](${origin}/contacts)`,
    '',
  )

  const bySector = new Map<string, Array<{ company: string; slug: string }>>()
  for (const m of members.docs) {
    const company = m.company?.trim()
    if (!company) continue
    const sector =
      m.powerGroup && typeof m.powerGroup === 'object' ? m.powerGroup.title : '—'
    const list = bySector.get(sector) ?? []
    list.push({ company, slug: slugify(company, { lower: true, strict: true }) })
    bySector.set(sector, list)
  }
  if (bySector.size > 0) {
    out.push(`## ${c.sectors}`, '')
    for (const [sector, companies] of [...bySector].sort(([a], [b]) => a.localeCompare(b))) {
      out.push(
        `- ${sector}: ${companies
          .map((x) => `[${x.company}](${origin}/companies/${x.slug})`)
          .join(', ')}`,
      )
    }
    out.push('')
  }

  const faqs = ((faq.docs[0] as Record<string, any> | undefined)?.faqs ?? []) as Array<{
    question?: string
    answer?: string
  }>
  const answered = faqs.filter((f) => f.question && f.answer)
  if (answered.length > 0) {
    out.push(`## ${c.faq}`, '')
    for (const f of answered) {
      out.push(`### ${f.question}`, '', plainTextFrom(f.answer, 600), '')
    }
  }

  const profiles = socialProfileUrls(settings as Parameters<typeof socialProfileUrls>[0])
  if (profiles.length > 0) {
    out.push(`## ${c.profiles}`, '', ...profiles.map((p) => `- ${p}`), '')
  }

  return new Response(out.join('\n'), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
