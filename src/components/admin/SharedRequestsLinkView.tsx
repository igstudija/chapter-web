import React from 'react'
import type { AdminViewServerProps } from 'payload'
import {
  getCurrentSharedRequestsToken,
  getSharedRequestsTokenExpiry,
} from '@/lib/sharedRequestsLink'
import { CopyLinkButton } from './CopyLinkButton'

/**
 * Admin view showing the brand-free special-requests link for each site. Open to
 * chapter admins (member-admins) and superadmins.
 *
 * The token is derived from the week, not stored, so there is nothing to generate
 * here — the link below is simply the one that works right now, and it replaces
 * itself every Monday.
 */
export async function SharedRequestsLinkView({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const user = req.user

  const isAdmin =
    user?.isSuperadmin === true ||
    (user as { currentRole?: string })?.currentRole === 'member-admin'

  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>403</h1>
        <p>Šī lapa pieejama tikai administratoriem.</p>
      </div>
    )
  }

  const token = getCurrentSharedRequestsToken()
  const expiry = getSharedRequestsTokenExpiry()

  const sites = await req.payload.find({
    collection: 'sites',
    where: {
      status: { equals: 'active' },
      includeInSharedRequests: { equals: true },
    },
    sort: 'name',
    limit: 50,
    overrideAccess: true,
  })

  const links = sites.docs
    .filter((site) => Boolean(site.domain))
    .map((site) => ({
      id: String(site.id),
      name: site.name,
      url: `https://${site.domain}/${token}`,
    }))

  return (
    <div style={{ padding: '2rem', maxWidth: '56rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Specifiskie pieprasījumi — koplietojamā saite</h1>
      <p style={{ marginBottom: '1.5rem', opacity: 0.75, lineHeight: 1.6 }}>
        Šī saite atver apvienoto specifisko pieprasījumu sarakstu (visas organizācijas kopā, bez
        zīmola un bez pieslēgšanās). Saite ir vienāda saturā neatkarīgi no tā, kuru domēnu
        izvēlies.
        <br />
        Tā <strong>nomainās automātiski</strong> katru pirmdienu — pēc tam vecā saite atver
        sākumlapu. Jauno saiti vienmēr atradīsi šeit.
      </p>

      <p style={{ marginBottom: '2rem' }}>
        <strong>Derīga līdz:</strong>{' '}
        {expiry.toLocaleString('lv-LV', { dateStyle: 'full', timeStyle: 'short' })}
      </p>

      {links.length === 0 ? (
        <p>
          Neviena vietne pagaidām nav iekļauta. Atzīmē <em>Include in shared special requests
          link</em> vajadzīgajām vietnēm Sites kolekcijā.
        </p>
      ) : (
        links.map((link) => (
          <div
            key={link.id}
            style={{
              border: '1px solid rgba(128,128,128,0.35)',
              borderRadius: '6px',
              padding: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{link.name}</div>
            <code style={{ display: 'block', wordBreak: 'break-all', marginBottom: '0.75rem' }}>
              {link.url}
            </code>
            <CopyLinkButton url={link.url} />
          </div>
        ))
      )}
    </div>
  )
}

export default SharedRequestsLinkView
