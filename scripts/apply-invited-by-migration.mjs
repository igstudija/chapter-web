import pg from 'pg'
import { readFileSync } from 'fs'

const env = readFileSync('.env', 'utf-8')
  .split('\n')
  .filter(l => l && !l.startsWith('#'))
  .reduce((acc, l) => {
    const [k, ...v] = l.split('=')
    if (k) acc[k.trim()] = v.join('=').trim()
    return acc
  }, {})

const MIGRATION_NAME = '20260416_114602_add_invited_by_to_event_submissions'

const client = new pg.Client({ connectionString: env.POSTGRESS_DATABASE_URL })
await client.connect()

try {
  await client.query('BEGIN')

  console.log(`Applying: ${MIGRATION_NAME}`)
  await client.query(`
    ALTER TABLE "event_submissions" ADD COLUMN IF NOT EXISTS "invited_by" varchar;
  `)

  const existing = await client.query(
    `SELECT id FROM payload_migrations WHERE name = $1`,
    [MIGRATION_NAME],
  )

  if (existing.rows.length === 0) {
    const maxBatch = await client.query(
      `SELECT COALESCE(MAX(batch), 0) AS max_batch FROM payload_migrations WHERE batch >= 0`,
    )
    const nextBatch = Number(maxBatch.rows[0].max_batch) + 1
    await client.query(
      `INSERT INTO payload_migrations (name, batch, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())`,
      [MIGRATION_NAME, nextBatch],
    )
    console.log(`Recorded migration in payload_migrations (batch ${nextBatch})`)
  } else {
    console.log('Migration already recorded — skipping insert')
  }

  await client.query('COMMIT')
  console.log('Committed.')

  const col = await client.query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_name = 'event_submissions' AND column_name = 'invited_by'`,
  )
  console.log('\n=== event_submissions.invited_by ===')
  console.table(col.rows)

  const migRow = await client.query(
    `SELECT name, batch, updated_at FROM payload_migrations WHERE name = $1`,
    [MIGRATION_NAME],
  )
  console.log('\n=== payload_migrations row ===')
  console.table(migRow.rows)
} catch (err) {
  await client.query('ROLLBACK')
  console.error('Migration failed, rolled back:', err)
  process.exitCode = 1
} finally {
  await client.end()
}
