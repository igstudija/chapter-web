'use client'

import Link from 'next/link'
import { useAuth } from '@payloadcms/ui'
import type { User } from '@/payload-types'

/**
 * Nav entry for the brand-free special-requests link view. Visible to chapter admins
 * (member-admins) and superadmins — the view itself re-checks, this just keeps it out
 * of ordinary members' sidebars. The link it points at is public/token-gated anyway.
 */
export function SharedRequestsNavLink() {
  const { user } = useAuth<User>()

  const isAdmin = user?.isSuperadmin === true || user?.currentRole === 'member-admin'
  if (!isAdmin) return null

  return (
    <Link
      href="/admin/shared-requests"
      className="nav__link"
      style={{ display: 'block', padding: '0.5rem 0' }}
    >
      Koplietojamā saite
    </Link>
  )
}
