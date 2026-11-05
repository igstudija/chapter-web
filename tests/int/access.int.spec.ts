import { describe, expect, it } from 'vitest'
import type { AccessArgs } from 'payload'
import { publishedForActiveMembers } from '@/access'
import { Wiki } from '@/collections/Pages'

const asUser = (user: Record<string, unknown> | null) =>
  ({ req: { user } }) as unknown as AccessArgs

describe('publishedForActiveMembers', () => {
  it('gives a signed-out visitor nothing, not even published documents', () => {
    expect(publishedForActiveMembers(asUser(null))).toBe(false)
  })

  it('gives a blocked member nothing', () => {
    expect(publishedForActiveMembers(asUser({ id: 1, role: 'member', status: 'blocked' }))).toBe(
      false,
    )
  })

  it('gives an active member published documents only', () => {
    expect(publishedForActiveMembers(asUser({ id: 1, role: 'member', status: 'active' }))).toEqual({
      _status: { equals: 'published' },
    })
  })

  it('gives an administrator drafts too', () => {
    expect(publishedForActiveMembers(asUser({ id: 1, role: 'member-admin' }))).toBe(true)
  })
})

describe('wiki collection', () => {
  it('is not readable through the API without signing in', () => {
    // /wiki redirects to /login; /api/wiki has to agree.
    const read = Wiki.access?.read
    expect(read).toBeDefined()
    expect(read!(asUser(null))).toBe(false)
  })
})
