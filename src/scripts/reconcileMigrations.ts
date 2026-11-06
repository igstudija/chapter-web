import 'dotenv/config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'
import config from '../payload.config'
import { migrations } from '../migrations'

/**
 * Put `payload_migrations` back in step with a database whose schema was
 * written by Payload's dev push rather than by the migrations.
 *
 * A dev server pointed at a database pushes the schema and records a row named
 * `dev` (batch -1). From then on `pnpm migrate` takes the database for drifted
 * and stops at an interactive "reset?" prompt — with nothing at the keyboard,
 * as on a deploy, it waits forever. The migrations that never ran are not
 * recorded either, so answering the prompt is no fix.
 *
 * This compares the live schema with the code first, and refuses to touch
 * anything unless the only differences are cosmetic — defaults, constraint
 * names, indexes. No column or table added, dropped or renamed. Then, in one
 * transaction, it deletes the `dev` row and records every migration not yet
 * recorded, each in its own batch, so a later `migrate:down` rolls back only
 * the newest one. The schema and the data are not touched.
 *
 *   pnpm migrate:reconcile           say what it would do
 *   pnpm migrate:reconcile --apply   do it
 *
 * See docs/howto/recover-from-a-dev-push.md.
 */

const apply = process.argv.includes('--apply')
const STRUCTURAL = /\b(ADD COLUMN|DROP COLUMN|CREATE TABLE|DROP TABLE|RENAME)\b/i

type Row = { name: string; batch: string | number }

const run = async () => {
  const payload = await getPayload({ config })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = payload.db as any
  const db = adapter.drizzle
  const known = new Set(migrations.map((m) => m.name))

  const before = await db.execute(sql`select name, batch from payload_migrations order by id`)
  const rows: Row[] = before.rows ?? before
  console.log(`Recorded now: ${rows.map((r) => `${r.name} (batch ${r.batch})`).join(', ') || 'nothing'}`)

  const unknown = rows.filter((r) => r.name !== 'dev' && !known.has(r.name))
  if (unknown.length) {
    throw new Error(
      `Recorded migrations this code does not have: ${unknown.map((r) => r.name).join(', ')}. ` +
        'The database is ahead of this checkout — update the code before reconciling.',
    )
  }
  const devRows = rows.filter((r) => Number(r.batch) === -1)
  const recorded = new Set(rows.filter((r) => Number(r.batch) !== -1).map((r) => r.name))
  const missing = migrations.filter((m) => !recorded.has(m.name))
  if (devRows.length === 0 && missing.length === 0) {
    console.log('Nothing to do: every migration is recorded and there is no dev row.')
    process.exit(0)
  }

  const { pushSchema } = adapter.requireDrizzleKit()
  const diff = await pushSchema(
    adapter.schema,
    db,
    adapter.schemaName ? [adapter.schemaName] : undefined,
    adapter.tablesFilter,
  )
  const statements = diff.statementsToExecute as string[]
  const structural = statements.filter((s) => STRUCTURAL.test(s))
  console.log(`Schema differences from the code: ${statements.length}`)
  for (const s of statements) console.log(`  ${s.replace(/\s+/g, ' ').trim()}`)
  if (structural.length || diff.hasDataLoss) {
    throw new Error(
      'The schema differs from the code structurally (the lines with ADD/DROP COLUMN, CREATE/DROP TABLE or RENAME above). ' +
        'Recording the migrations would hide that. Apply the missing parts first — see the how-to.',
    )
  }

  const maxBatch = Math.max(0, ...rows.filter((r) => Number(r.batch) > 0).map((r) => Number(r.batch)))
  console.log(
    `${apply ? 'Doing' : 'Would do'}: ${devRows.length ? 'delete the dev row; ' : ''}record ${missing.length} migration(s) ` +
      `in batches ${maxBatch + 1}–${maxBatch + missing.length}: ${missing.map((m) => m.name).join(', ')}`,
  )
  if (!apply) {
    console.log('Dry run. Re-run with --apply to change payload_migrations.')
    process.exit(0)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.transaction(async (tx: any) => {
    await tx.execute(sql`delete from payload_migrations where batch = -1`)
    let batch = maxBatch
    for (const m of missing) {
      batch += 1
      await tx.execute(sql`insert into payload_migrations (name, batch) values (${m.name}, ${batch})`)
    }
  })

  const after = await db.execute(sql`select name, batch from payload_migrations order by id`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log(`Recorded now: ${(after.rows ?? after).map((r: any) => `${r.name} (batch ${r.batch})`).join(', ')}`)
  console.log('Done. `pnpm migrate` should now report nothing to run.')
  process.exit(0)
}

run().catch((error) => {
  console.error(`migrate:reconcile: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
