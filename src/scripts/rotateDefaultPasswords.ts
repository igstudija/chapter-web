import 'dotenv/config'
import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'
import config from '../payload.config'

/**
 * Find the accounts that the old fixed password still opens, and close them.
 *
 * Until November 2026, an administrator adding a member with "Create New User"
 * gave the new account the password `ChangeMe123!` — written in the source,
 * which is public. Members sign in with magic links, so most never changed it,
 * and anyone who knew a member's email could sign in as them.
 *
 *   pnpm secure:passwords           list the accounts it still opens
 *   pnpm secure:passwords --apply   give each a random password nobody knows
 *
 * Read-only without `--apply`: it checks the stored hash directly instead of
 * trying to sign in, so it never counts a failed attempt or locks an account.
 * Afterwards those members sign in by magic link, as before, or set a password
 * through "forgot password". Nothing else about the account changes.
 *
 * See docs/howto/upgrade-to-the-november-2026-release.md.
 */

const OLD_DEFAULT = 'ChangeMe123!'
const apply = process.argv.includes('--apply')
const pbkdf2Async = promisify(pbkdf2)

// Payload's stored formats: a prefix naming the iteration count, or the legacy
// unprefixed 25 000-iteration, 512-byte hash.
const PREFIXES: Array<[string, number]> = [
  ['pbkdf2-sha256-100k-v1:', 100_000],
  ['pbkdf2-sha256-v1:', 600_000],
]

async function opensWith(password: string, salt: string, stored: string): Promise<boolean> {
  let hex = stored
  let iterations = 25_000
  let keyLength = 512
  for (const [prefix, count] of PREFIXES) {
    if (stored.startsWith(prefix)) {
      hex = stored.slice(prefix.length)
      iterations = count
      keyLength = 32
    }
  }
  const expected = Buffer.from(hex, 'hex')
  const actual = await pbkdf2Async(password, salt, iterations, keyLength, 'sha256')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

const run = async () => {
  const payload = await getPayload({ config })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (payload.db as any).drizzle
  const result = await db.execute(
    sql`select id, email, salt, hash from users where salt is not null and hash is not null order by id`,
  )
  const users: Array<{ id: number; email: string; salt: string; hash: string }> = result.rows ?? result

  const exposed: typeof users = []
  for (const user of users) {
    if (await opensWith(OLD_DEFAULT, user.salt, user.hash)) exposed.push(user)
  }

  console.log(`${users.length} accounts with a password; ${exposed.length} still open with the old default.`)
  for (const user of exposed) console.log(`  #${user.id} ${user.email}`)
  if (exposed.length === 0) process.exit(0)

  if (!apply) {
    console.log('Dry run. Re-run with --apply to give these accounts a random password.')
    process.exit(0)
  }

  for (const user of exposed) {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { password: randomBytes(32).toString('base64url') },
      depth: 0,
    })
  }
  console.log(`Done: ${exposed.length} account(s) now have a password nobody knows.`)
  process.exit(0)
}

run().catch((error) => {
  console.error(`secure:passwords: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
