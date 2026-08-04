import 'dotenv/config'
import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { getPayload } from 'payload'
import type { CollectionSlug, JsonObject } from 'payload'
import config from '../payload.config'
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
 * Run with: pnpm bootstrap
 */

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
      // A value with a default does not need a terminal — the default is the
      // answer. Only the three that genuinely have no sensible default stop a
      // non-interactive run.
      if (fallback) return fallback
      throw new Error(
        `${envVar} is not set and there is no terminal to prompt on. ` +
          'Set SETUP_ORG_NAME, SETUP_ADMIN_EMAIL and SETUP_ADMIN_PASSWORD ' +
          'to run setup non-interactively.',
      )
    }
    const answer = (await rl.question(fallback ? `${question} [${fallback}] ` : `${question} `)).trim()
    return answer || fallback || ''
  }

  console.log(`\n${PRODUCT_NAME} setup\n${'='.repeat(PRODUCT_NAME.length + 6)}\n`)

  const payload = await getPayload({ config })

  // --- Settings -------------------------------------------------------------
  // A single settings document carries the organisation's name, language and
  // module switches. This used to create a `Sites` record with a domain, since
  // one install could serve several organisations and the domain is what
  // decided which one a request belonged to.
  const existingSettings = await payload.find({ collection: 'settings', limit: 1 })

  // Held for the page-configuration records below, which display it.
  let orgName: string

  if (existingSettings.docs.length > 0) {
    orgName = existingSettings.docs[0].siteName
    console.log(`✓ Settings already exist: ${orgName} — skipping.`)
  } else {
    const name = await value('SETUP_ORG_NAME', 'Organisation name:')
    if (!name) throw new Error('An organisation name is required.')
    orgName = name

    await payload.create({
      collection: 'settings',
      data: {
        siteName: name,
        locale: 'lv',
        // Required on the collection; both are editable in the admin panel and
        // fall back to the EMAIL_FROM environment variable until they are.
        emailFrom: process.env.EMAIL_FROM || 'noreply@example.org',
        emailFromName: name,
      },
      overrideAccess: true,
    })
    console.log(`✓ Created settings for: ${name}`)
  }

  // --- Administrator --------------------------------------------------------
  const existingAdmins = await payload.find({
    collection: 'users',
    where: { role: { equals: 'member-admin' } },
    limit: 1,
  })

  if (existingAdmins.docs.length > 0) {
    console.log(`✓ Administrator already exists: ${existingAdmins.docs[0].email} — skipping.`)
  } else {
    const email = (await value('SETUP_ADMIN_EMAIL', 'Administrator email:')).toLowerCase()
    if (!isEmail(email)) throw new Error(`"${email}" is not a valid email address.`)

    const password = await value('SETUP_ADMIN_PASSWORD', 'Administrator password (min 8 chars):')
    if (password.length < 8) throw new Error('Password must be at least 8 characters.')

    // Both are required on User and appear throughout the UI, so they are
    // prompted rather than defaulted to something the operator would have to
    // hunt down and correct later.
    const firstName = await value('SETUP_ADMIN_FIRST_NAME', 'Administrator first name:', 'Admin')
    const lastName = await value('SETUP_ADMIN_LAST_NAME', 'Administrator last name:', 'User')

    const user = await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        name: firstName,
        surname: lastName,
        role: 'member-admin',
        status: 'active',
      },
      overrideAccess: true,
    })

    // The member profile is what gives them a presence in the directory; the
    // role on the user record is what grants the rights.
    const existingProfile = await payload.find({
      collection: 'members',
      where: { user: { equals: user.id } },
      limit: 1,
    })

    if (existingProfile.docs.length === 0) {
      await payload.create({
        collection: 'members',
        data: { user: user.id, role: 'member-admin', status: 'active' },
        overrideAccess: true,
      })
    }

    console.log(`✓ Created administrator: ${email}`)
  }

  // --- Page configuration ---------------------------------------------------
  // Seven records the pages read their headings and copy from. Payload creates
  // none of them on demand, so without this an install that reported success
  // still renders its first screen half-built — and that screen is the only
  // evidence a Self-hoster has that the install worked at all.
  //
  // Defaults only. No fictional members, events or articles: a site that
  // renders correctly while empty is an install that worked, whereas one seeded
  // with invented people is a demo that has to be cleaned out before launch.
  // Where a page needs prose we cannot know, it carries the same [bracketed]
  // prompt the policy templates use, so it reads as something awaiting an
  // editor rather than as something the software believes.
  const pageConfig: Array<{ collection: CollectionSlug; label: string; data: JsonObject }> = [
    { collection: 'homepage-settings', label: 'Homepage', data: { internalTitle: orgName } },
    {
      collection: 'about-us-settings',
      label: 'About page',
      data: {
        introduction: `[Introduce ${orgName} here. This paragraph opens the About page.]`,
      },
    },
    { collection: 'faq-settings', label: 'FAQ page', data: {} },
    { collection: 'companies-page-settings', label: 'Companies page', data: {} },
    { collection: 'contacts-page-settings', label: 'Contacts page', data: {} },
    { collection: 'listing-pages-seo', label: 'Listing page SEO', data: {} },
    { collection: 'slideshow-settings-collection', label: 'Slideshow', data: {} },
  ]

  for (const { collection, label, data } of pageConfig) {
    const existing = await payload.find({ collection, limit: 1, overrideAccess: true })

    if (existing.docs.length > 0) {
      console.log(`✓ ${label} configuration already exists — skipping.`)
      continue
    }

    await payload.create({ collection, data, overrideAccess: true })
    console.log(`✓ Created ${label} configuration`)
  }

  await rl?.close()

  const port = process.env.PORT || '3050'
  console.log(`
Setup complete.

  Member portal   http://localhost:${port}
  Admin panel     http://localhost:${port}/admin

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
