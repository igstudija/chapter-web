import { describe, expect, it } from 'vitest'
import type { Field } from 'payload'
import { memberDisplayName } from '@/lib/memberDisplayName'
import { MCP_COLLECTIONS, requireActiveAdmin } from '@/lib/mcp'
import { GUEST_PATHS, guestPathFor, isGuestPath } from '@/lib/nextMeeting'
import { Members } from '@/collections/Members'
import { SlideshowSettingsCollection } from '@/collections/SlideshowSettingsCollection'

describe('member display name', () => {
  it('leads with the person, then the company', () => {
    expect(memberDisplayName({ name: 'Jānis', surname: 'Bērziņš', company: 'SIA Koks' })).toBe(
      'Jānis Bērziņš (SIA Koks)',
    )
  })

  it('collapses stray whitespace and copes with missing parts', () => {
    expect(memberDisplayName({ name: ' Jānis ', surname: null, company: '  SIA   Koks ' })).toBe(
      'Jānis (SIA Koks)',
    )
    expect(memberDisplayName({ name: 'Anna', surname: 'Ozola' })).toBe('Anna Ozola')
    expect(memberDisplayName({ company: 'SIA Koks' })).toBe('SIA Koks')
    expect(memberDisplayName({})).toBe('')
  })

  it('is the member title, so every member picker lists people', () => {
    expect(Members.admin?.useAsTitle).toBe('displayName')
    const skip = SlideshowSettingsCollection.fields.find(
      (f) => 'name' in f && f.name === 'skipMembers',
    ) as Extract<Field, { type: 'relationship' }>
    expect(skip.relationTo).toBe('members')
    expect((skip.admin as { sortOptions?: string }).sortOptions).toBe('displayName')
  })
})

describe('MCP server', () => {
  const offered = Object.entries(MCP_COLLECTIONS)

  it('never offers logins, the audit trail or another chapter’s secret', () => {
    for (const slug of ['users', 'audit-logs', 'chapter-connections', 'payload-mcp-api-keys']) {
      expect(MCP_COLLECTIONS).not.toHaveProperty(slug)
    }
  })

  it('never offers a delete', () => {
    for (const [slug, config] of offered) {
      expect(config?.enabled, slug).not.toBe(true)
      expect((config?.enabled as { delete?: boolean }).delete, slug).toBeUndefined()
    }
  })

  // Slugs are typed as CollectionSlug, so a collection that does not exist fails
  // `pnpm typecheck` rather than a request.

  const settingsFor = (user: Record<string, unknown> | undefined) => async () =>
    ({ user }) as never

  it('answers only while the key’s owner is an administrator in good standing', async () => {
    const req = {} as never
    await expect(
      requireActiveAdmin(req, settingsFor({ id: 1, role: 'member-admin', status: 'active' })),
    ).resolves.toBeTruthy()
    await expect(
      requireActiveAdmin(req, settingsFor({ id: 1, role: 'member', status: 'active' })),
    ).rejects.toThrow()
    await expect(
      requireActiveAdmin(req, settingsFor({ id: 1, role: 'member-admin', status: 'blocked' })),
    ).rejects.toThrow()
    await expect(requireActiveAdmin(req, settingsFor(undefined))).rejects.toThrow()
  })
})

describe('guest short link', () => {
  it('follows the site language, and recognises either', () => {
    expect(guestPathFor('lv')).toBe('/viesis')
    expect(guestPathFor('en')).toBe('/guest')
    expect(guestPathFor(undefined)).toBe('/guest')
    expect(isGuestPath(GUEST_PATHS.lv)).toBe(true)
    expect(isGuestPath(GUEST_PATHS.en)).toBe(true)
    expect(isGuestPath('/events')).toBe(false)
    expect(isGuestPath(null)).toBe(false)
  })
})
