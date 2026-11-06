import { describe, expect, it } from 'vitest'
import { isRetiredPassword, RETIRED_PASSWORDS } from '@/lib/retiredPasswords'
import { Users } from '@/collections/Users'

describe('retired passwords', () => {
  it('knows the default "Create New User" used to hand out', () => {
    expect(RETIRED_PASSWORDS).toContain('ChangeMe123!')
    expect(isRetiredPassword('ChangeMe123!')).toBe(true)
  })

  it('matches exactly, and nothing that is not a string', () => {
    expect(isRetiredPassword('changeme123!')).toBe(false)
    expect(isRetiredPassword('ChangeMe123! ')).toBe(false)
    expect(isRetiredPassword(undefined)).toBe(false)
    expect(isRetiredPassword(null)).toBe(false)
  })

  it('cannot be stored as anyone’s password', () => {
    const hook = Users.hooks?.beforeValidate?.[0]
    expect(hook).toBeDefined()
    const run = (password: string) =>
      hook!({ data: { password }, operation: 'update', req: {} } as never)
    expect(() => run('ChangeMe123!')).toThrow()
    expect(() => run('a-real-password-1')).not.toThrow()
  })

  it('does not get through Payload’s own sign-in either', async () => {
    const hook = Users.hooks?.beforeLogin?.[0]
    expect(hook).toBeDefined()
    const user = { id: 1, status: 'active' }
    await expect(
      hook!({ req: { data: { email: 'a@example.org', password: 'ChangeMe123!' } }, user } as never),
    ).rejects.toThrow(/no longer accepted/)
    await expect(
      hook!({ req: { data: { email: 'a@example.org', password: 'fine-password-2' } }, user } as never),
    ).resolves.toBe(user)
  })
})
