import pg from 'pg'
import { readFileSync } from 'fs'

// Load .env manually
const env = readFileSync('.env', 'utf-8')
  .split('\n')
  .filter(l => l && !l.startsWith('#'))
  .reduce((acc, l) => {
    const [k, ...v] = l.split('=')
    if (k) acc[k.trim()] = v.join('=').trim()
    return acc
  }, {})

const client = new pg.Client({ connectionString: env.POSTGRESS_DATABASE_URL })
await client.connect()

console.log('=== Tables matching pages/wiki ===')
const tables = await client.query(`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public' AND (tablename LIKE '%pages%' OR tablename LIKE '%wiki%')
  ORDER BY tablename
`)
console.table(tables.rows)

console.log('\n=== Enum types matching pages/wiki ===')
const enums = await client.query(`
  SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE t.typname LIKE '%pages%' OR t.typname LIKE '%wiki%'
  GROUP BY t.typname
  ORDER BY t.typname
`)
console.table(enums.rows)

console.log('\n=== Row counts in pages/wiki tables ===')
for (const { tablename } of tables.rows) {
  const r = await client.query(`SELECT COUNT(*)::int AS c FROM "${tablename}"`)
  console.log(`${tablename}: ${r.rows[0].c} rows`)
}

await client.end()
