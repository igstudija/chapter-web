import 'dotenv/config'
import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { getPayload } from 'payload'
import config from '../payload.config'
import { PRIMARY_SUPERADMIN_HOST, SUPERADMIN_HOSTS } from '../lib/constants'
import { PRODUCT_NAME } from '../lib/branding'

/**
 * First-run setup.
 *
 * Creates the two records an install cannot function without: one organisation
 * and one superadmin account, plus an admin membership linking them. Everything
 * else is configured from the admin panel afterwards.
 *
 * Safe to re-run: each step checks for an existing record first and skips it, so
 * this can be used to add a superadmin to an install that already has an
 * organisation, or vice versa. It never modifies existing records.
 *
 * Non-interactive (CI, Docker entrypoint) — set all four and prompts are skipped:
 *   SETUP_ORG_NAME, SETUP_ORG_DOMAIN, SETUP_ADMIN_EMAIL, SETUP_ADMIN_PASSWORD
 *
 * Run with: pnpm setup
 */

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics so slugs stay URL-safe
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

async function main() {
  const interactive = stdin.isTTY
  const rl = interactive ? readline.createInterface({ input: stdin, output: stdout }) : null

  /** Read a value from env, else prompt. Fails loudly when neither is possible. */
  const value = async (
    envVar: string,
    question: string,
    fallback?: string,
  ): Promise<string> => {
    const fromEnv = process.env[envVar]?.trim()
    if (fromEnv) return fromEnv
    if (!rl) {
      throw new Error(
        `${envVar} is not set and there is no terminal to prompt on. ` +
          'Set SETUP_ORG_NAME, SETUP_ORG_DOMAIN, SETUP_ADMIN_EMAIL and SETUP_ADMIN_PASSWORD ' +
          'to run setup non-interactively.',
      )
    }
    const answer = (await rl.question(fallback ? `${question} [${fallback}] ` : `${question} `)).trim()
    return answer || fallback || ''
  }

  console.log(`\n${PRODUCT_NAME} setup\n${'='.repeat(PRODUCT_NAME.length + 6)}\n`)

  const payload = await getPayload({ config })

  // --- Organisation ---------------------------------------------------------
  const existingSites = await payload.find({ collection: 'sites', limit: 1 })

  let siteId: string | number
  if (existingSites.docs.length > 0) {
    siteId = existingSites.docs[0].id
    console.log(`✓ Organisation already exists: ${existingSites.docs[0].name} — skipping.`)
  } else {
    const name = await value('SETUP_ORG_NAME', 'Organisation name:')
    if (!name) throw new Error('An organisation name is required.')

    // The domain is what maps an incoming request to this organisation. A
    // single-organisation install also matches on the sole-active-site
    // fallback, so getting this wrong now is recoverable from the admin panel.
    const domain = await value(
      'SETUP_ORG_DOMAIN',
      'Primary domain (no protocol, e.g. riga.example.org):',
      'localhost',
    )

    const site = await payload.create({
      collection: 'sites',
      data: {
        name,
        slug: slugify(name) || 'main',
        domain: domain.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
        status: 'active',
      },
    })
    siteId = site.id
    console.log(`✓ Created organisation: ${name}`)
  }

  // --- Superadmin -----------------------------------------------------------
  const existingSuperadmins = await payload.find({
    collection: 'users',
    where: { isSuperadmin: { equals: true } },
    limit: 1,
  })

  if (existingSuperadmins.docs.length > 0) {
    console.log(`✓ Superadmin already exists: ${existingSuperadmins.docs[0].email} — skipping.`)
  } else {
    const email = (await value('SETUP_ADMIN_EMAIL', 'Superadmin email:')).toLowerCase()
    if (!isEmail(email)) throw new Error(`"${email}" is not a valid email address.`)

    const password = await value('SETUP_ADMIN_PASSWORD', 'Superadmin password (min 8 chars):')
    if (password.length < 8) throw new Error('Password must be at least 8 characters.')

    // Both are required on User and appear throughout the UI, so they are
    // prompted rather than defaulted to something the operator would have to
    // hunt down and correct later.
    const firstName = await value('SETUP_ADMIN_FIRST_NAME', 'Superadmin first name:', 'Admin')
    const lastName = await value('SETUP_ADMIN_LAST_NAME', 'Superadmin last name:', 'User')

    const user = await payload.create({
      collection: 'users',
      data: { email, password, name: firstName, surname: lastName, isSuperadmin: true },
      // The Users beforeChange hook blocks creating superadmins from a
      // non-superadmin host; a CLI run has no host at all, so it must opt out
      // of that check explicitly.
      overrideAccess: true,
      context: { overrideAccess: true },
    })

    // An admin membership is what gives the superadmin a profile and admin
    // rights inside the organisation itself; the isSuperadmin flag alone only
    // grants cross-organisation access.
    const existingMembership = await payload.find({
      collection: 'site-memberships',
      where: { and: [{ user: { equals: user.id } }, { site: { equals: siteId } }] },
      limit: 1,
    })

    if (existingMembership.docs.length === 0) {
      await payload.create({
        collection: 'site-memberships',
        data: { user: user.id, site: siteId, role: 'member-admin', status: 'active' },
        overrideAccess: true,
      })
    }

    console.log(`✓ Created superadmin: ${email}`)
  }

  await rl?.close()

  const port = process.env.PORT || '3050'
  console.log(`
Setup complete.

  Organisation site   http://localhost:${port}
  Admin panel         http://localhost:${port}/admin
  Superadmin console  http://${PRIMARY_SUPERADMIN_HOST}:${port}/admin

The superadmin console is served on these hosts: ${SUPERADMIN_HOSTS.join(', ')}
Change them with NEXT_PUBLIC_SUPERADMIN_HOSTS. Hosts not on that list resolve to
an organisation instead.

Next:
  pnpm seed:policies   add Terms/Privacy/Cookie skeletons (they need editing)
  pnpm dev             start the dev server
`)
  process.exit(0)
}

main().catch((error) => {
  console.error('\nSetup failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
