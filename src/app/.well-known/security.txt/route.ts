import { siteOrigin } from '@/lib/seoHelpers'

/** The software's private vulnerability channel (SECURITY.md). */
const SOFTWARE_ADVISORIES = 'https://github.com/igstudija/chapter-web/security/advisories/new'

/**
 * /.well-known/security.txt (RFC 9116) — where to report a vulnerability.
 *
 * Generated rather than a static file so `Expires` is always about a year
 * ahead; a security.txt past its expiry date is to be treated as stale.
 */
export function GET() {
  const contacts = [process.env.SECURITY_CONTACT?.trim(), SOFTWARE_ADVISORIES].filter(
    (c): c is string => Boolean(c && /^(mailto:|https:\/\/)/.test(c)),
  )
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  expires.setUTCHours(0, 0, 0, 0)
  const origin = siteOrigin()

  const lines = [
    ...contacts.map((c) => `Contact: ${c}`),
    `Expires: ${expires.toISOString()}`,
    'Preferred-Languages: lv, en',
    ...(origin ? [`Canonical: ${origin}/.well-known/security.txt`] : []),
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
