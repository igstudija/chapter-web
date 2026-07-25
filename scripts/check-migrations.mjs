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

const client = new pg.Client({ connectionString: env.POSTGRESS_DATABASE_URL })
await client.connect()

console.log('=== payload_migrations table ===')
const m = await client.query(`SELECT name, batch, updated_at FROM payload_migrations ORDER BY updated_at`)
console.table(m.rows)

console.log('\n=== enum_pages_status exists? ===')
const pgEnum = await client.query(`SELECT typname FROM pg_type WHERE typname LIKE '%pages%' OR typname LIKE '%wiki%'`)
console.table(pgEnum.rows)

console.log('\n=== pages table exists? ===')
const pgTable = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%pages%'`)
console.table(pgTable.rows)

await client.end()
