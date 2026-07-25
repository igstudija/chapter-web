/**
 * Copy one organisation out of the old multi-tenant install into this one.
 *
 *   node scripts/migrate-legacy-site.mjs --site 1 [--apply]
 *
 * Reads the source from `.env.old` and the target from `.env`. Without
 * `--apply` it reports what it would copy and changes nothing.
 *
 * Why SQL rather than the Payload API: the two schemas are the same shape apart
 * from the tenant column, so rows can be copied verbatim and — crucially — keep
 * their ids. Every foreign key between them (member → user, top40 → user,
 * settings → media) then stays valid with no remapping. Going through the API
 * would assign new ids and turn this into a graph-rewriting exercise, and would
 * re-run hooks that assume a document is being authored rather than restored.
 *
 * What is deliberately left behind:
 *   - version/draft history (`_*_v`) — published content lives in the main
 *     tables; the drafts belong to a schema that no longer exists
 *   - `audit_logs` — its action enum still names superadmin events
 *   - `ai_settings`, `sites` — collections this install does not have
 *   - `users_sessions`, `payload_*` — session and editor state, not data
 *
 * Passwords come across: `hash` and `salt` are ordinary columns, so members
 * keep the credentials they already have.
 */
import fs from 'node:fs'
import pg from 'pg'

const argv = process.argv.slice(2)
const SITE_ID = Number(argv[argv.indexOf('--site') + 1] || 1)
const APPLY = argv.includes('--apply')

const readEnv = (file) =>
  Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
      }),
  )

/** Old table → new table. Everything else keeps its name. */
const TABLE_MAP = {
  site_memberships: 'members',
  site_memberships_gallery: 'members_gallery',
  site_settings_collection: 'settings',
  site_settings_collection_admin_emails: 'settings_admin_emails',
  site_settings_collection_schema_same_as: 'settings_schema_same_as',
  about_us_settings_bni_principles: 'about_us_settings_principles',
}

/** Old column → new column, applied to every table. */
const COLUMN_MAP = {
  bni_position: 'org_role',
  site_memberships_id: 'members_id',
}

/**
 * Copy order. Parents first: a row may only be inserted once everything its
 * foreign keys point at is already there.
 *
 * `filter` is how rows belonging to this organisation are recognised:
 *   site    — a `site_id` column
 *   parent  — a `_parent_id`/`parent_id` into a table copied earlier
 *   users   — the member list computed up front
 *   all     — global content with no tenant of its own
 */
const PLAN = [
  { table: 'users', filter: 'users' },
  { table: 'media', filter: 'site' },
  { table: 'power_groups', filter: 'site' },
  { table: 'site_memberships', filter: 'site' },
  { table: 'site_memberships_gallery', filter: 'parent', parent: 'site_memberships' },

  { table: 'events', filter: 'site' },
  { table: 'blog', filter: 'site' },
  { table: 'wiki', filter: 'site' },
  { table: 'wiki_blocks_hero', filter: 'parent', parent: 'wiki' },
  { table: 'wiki_blocks_content_section', filter: 'parent', parent: 'wiki' },
  { table: 'wiki_blocks_contact_info', filter: 'parent', parent: 'wiki' },
  { table: 'wiki_blocks_team_grid', filter: 'parent', parent: 'wiki' },
  { table: 'wiki_blocks_faq', filter: 'parent', parent: 'wiki' },
  { table: 'wiki_blocks_faq_items', filter: 'parent', parent: 'wiki_blocks_faq' },
  { table: 'wiki_rels', filter: 'parent', parent: 'wiki', parentCol: 'parent_id' },

  { table: 'top40', filter: 'site' },
  { table: 'top20', filter: 'site' },
  { table: 'special_requests', filter: 'site' },
  { table: 'success_stories', filter: 'site' },
  { table: 'one_to_one_meetings', filter: 'site' },
  { table: 'one_to_one_meetings_comments', filter: 'parent', parent: 'one_to_one_meetings' },
  { table: 'referrals', filter: 'site' },
  { table: 'contact_submissions', filter: 'site' },
  { table: 'event_submissions', filter: 'site' },

  { table: 'homepage_settings', filter: 'site' },
  { table: 'homepage_settings_stats_items', filter: 'parent', parent: 'homepage_settings' },
  { table: 'contacts_page_settings', filter: 'site' },
  { table: 'contacts_page_settings_contact_persons', filter: 'parent', parent: 'contacts_page_settings' },
  { table: 'about_us_settings', filter: 'site' },
  { table: 'about_us_settings_bni_principles', filter: 'parent', parent: 'about_us_settings' },
  { table: 'about_us_settings_chapter_leaders', filter: 'parent', parent: 'about_us_settings' },
  { table: 'about_us_settings_how_we_work_meetings', filter: 'parent', parent: 'about_us_settings' },
  { table: 'about_us_settings_membership_info_benefits', filter: 'parent', parent: 'about_us_settings' },
  { table: 'faq_settings', filter: 'site' },
  { table: 'faq_settings_faqs', filter: 'parent', parent: 'faq_settings' },
  { table: 'companies_page_settings', filter: 'site' },
  { table: 'listing_pages_seo', filter: 'site' },
  { table: 'site_settings_collection', filter: 'site' },
  { table: 'site_settings_collection_admin_emails', filter: 'parent', parent: 'site_settings_collection' },
  { table: 'site_settings_collection_schema_same_as', filter: 'parent', parent: 'site_settings_collection' },

  { table: 'slideshow_settings_collection', filter: 'site' },
  { table: 'gu', filter: 'parent', parent: 'slideshow_settings_collection' },
  { table: 'img', filter: 'parent', parent: 'slideshow_settings_collection' },
  { table: 'lw', filter: 'parent', parent: 'slideshow_settings_collection' },
  { table: 'pg', filter: 'parent', parent: 'slideshow_settings_collection' },
  { table: 'sm', filter: 'parent', parent: 'slideshow_settings_collection' },
  { table: 'sm_cer', filter: 'parent', parent: 'sm' },
  { table: 'slideshow_settings_collection_rels', filter: 'parent', parent: 'slideshow_settings_collection', parentCol: 'parent_id' },

  { table: 'policy_templates', filter: 'all' },
]

const columnsOf = async (client, table) =>
  (
    await client.query(
      `select column_name from information_schema.columns
       where table_schema='public' and table_name=$1`,
      [table],
    )
  ).rows.map((r) => r.column_name)

/**
 * `pg` hands back json/jsonb already parsed, and hands a parsed array straight
 * to the driver as a Postgres array literal on the way in — which a json column
 * rejects. Re-serialising them keeps rich-text content intact.
 */
const jsonColumnsOf = async (client, table) =>
  new Set(
    (
      await client.query(
        `select column_name from information_schema.columns
         where table_schema='public' and table_name=$1 and data_type in ('json','jsonb')`,
        [table],
      )
    ).rows.map((r) => r.column_name),
  )

async function main() {
  const source = new pg.Client({ connectionString: readEnv('.env.old').POSTGRESS_DATABASE_URL })
  const target = new pg.Client({ connectionString: readEnv('.env').POSTGRESS_DATABASE_URL })
  await source.connect()
  await target.connect()

  const site = (await source.query('select * from sites where id=$1', [SITE_ID])).rows[0]
  if (!site) throw new Error(`No site with id ${SITE_ID} in the source database.`)
  console.log(`Source organisation: ${site.name} (${site.domain})`)
  console.log(APPLY ? 'Mode: APPLY\n' : 'Mode: dry run — nothing will be written\n')

  // Who belongs to this organisation, and what they are allowed to do. Role and
  // status lived on the membership; in this schema they live on the user.
  const memberships = (
    await source.query('select user_id, role, status from site_memberships where site_id=$1', [SITE_ID])
  ).rows
  const roleByUser = new Map(memberships.map((m) => [m.user_id, m]))
  const userIds = [...roleByUser.keys()]
  console.log(`Members: ${userIds.length}`)

  const copiedIds = new Map() // old table name → ids that came across
  const report = []

  if (APPLY) {
    // The target is a fresh install; its only rows are the ones `pnpm setup`
    // made. Clearing them lets every copied row keep its original id.
    const targets = [...new Set(PLAN.map((s) => TABLE_MAP[s.table] || s.table))]
    await target.query(`truncate ${targets.map((t) => `"${t}"`).join(', ')} restart identity cascade`)
    console.log('Target tables cleared.\n')
  }

  for (const step of PLAN) {
    const oldTable = step.table
    const newTable = TABLE_MAP[oldTable] || oldTable

    const oldCols = await columnsOf(source, oldTable)
    const newCols = await columnsOf(target, newTable)
    const jsonCols = await jsonColumnsOf(target, newTable)
    if (newCols.length === 0) {
      report.push([oldTable, 'skipped — no such table in target', 0])
      continue
    }

    let where = ''
    const params = []
    if (step.filter === 'site') {
      where = `where site_id = $1`
      params.push(SITE_ID)
    } else if (step.filter === 'users') {
      where = `where id = any($1)`
      params.push(userIds)
    } else if (step.filter === 'parent') {
      const parentIds = copiedIds.get(step.parent) || []
      if (parentIds.length === 0) {
        report.push([oldTable, 'no parents copied', 0])
        continue
      }
      where = `where ${step.parentCol || '_parent_id'} = any($1)`
      params.push(parentIds)
    }

    const rows = (await source.query(`select * from "${oldTable}" ${where}`, params)).rows
    if (rows.length === 0) {
      report.push([oldTable, 'empty', 0])
      continue
    }
    if (rows[0].id !== undefined) copiedIds.set(oldTable, rows.map((r) => r.id))

    // Only columns the target actually has, after renames.
    const mapped = oldCols
      .map((c) => ({ from: c, to: COLUMN_MAP[c] || c }))
      .filter((c) => newCols.includes(c.to) && c.to !== 'site_id')

    if (APPLY) {
      for (const row of rows) {
        const cols = mapped.map((c) => c.to)
        // Every non-null json value is re-serialised, strings included. These
        // columns hold rich text, and some of it is stored as a JSON *string* of
        // HTML: handed back as a plain JS string, it has to be quoted and
        // escaped again or Postgres tries to parse the markup as JSON.
        const values = mapped.map((c) =>
          jsonCols.has(c.to) && row[c.from] !== null && row[c.from] !== undefined
            ? JSON.stringify(row[c.from])
            : row[c.from],
        )

        // Role and status move from the membership onto the user.
        if (oldTable === 'users') {
          const m = roleByUser.get(row.id)
          cols.push('role', 'status')
          values.push(m?.role || 'member', m?.status || 'active')
        }
        // The tenant record's own configuration becomes part of settings.
        if (oldTable === 'site_settings_collection') {
          for (const [col, val] of [
            ['locale', site.locale || 'lv'],
            ['timezone', site.timezone || 'Europe/Riga'],
            ['enable_activities', site.enable_activities ?? false],
            ['enable_attendance', site.enable_attendance ?? false],
            ['enable_success_stories', site.enable_success_stories ?? false],
          ]) {
            if (newCols.includes(col)) {
              cols.push(col)
              values.push(val)
            }
          }
        }

        try {
          await target.query(
            `insert into "${newTable}" (${cols.map((c) => `"${c}"`).join(',')})
             values (${cols.map((_, i) => `$${i + 1}`).join(',')})`,
            values,
          )
        } catch (e) {
          throw new Error(`${oldTable} → ${newTable}, row id ${row.id}: ${e.message}`)
        }
      }
    }

    report.push([`${oldTable}${newTable !== oldTable ? ` → ${newTable}` : ''}`, 'copied', rows.length])
  }

  if (APPLY) {
    // Identity columns were fed explicit values; without this the next insert
    // reuses id 1 and collides.
    for (const step of PLAN) {
      const t = TABLE_MAP[step.table] || step.table
      await target
        .query(
          `select setval(pg_get_serial_sequence('"${t}"','id'),
                  coalesce((select max(id) from "${t}"), 1))`,
        )
        .catch(() => {})
    }
    console.log('Sequences advanced past the copied ids.\n')
  }

  console.log('--- summary ---')
  for (const [table, note, n] of report) {
    if (n > 0 || note === 'copied') console.log(String(n).padStart(6), ' ', table)
  }
  console.log(`\nTotal rows: ${report.reduce((a, [, , n]) => a + n, 0)}`)
  if (!APPLY) console.log('\nDry run. Re-run with --apply to write.')

  await source.end()
  await target.end()
}

main().catch((e) => {
  console.error('MIGRATION FAILED:', e.message)
  process.exit(1)
})
