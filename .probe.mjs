import pg from 'pg'
import { readFileSync } from 'fs'

const env = readFileSync('.env', 'utf-8')
  .split('\n')
  .filter((l) => l && !l.startsWith('#') && l.includes('='))
  .reduce((acc, l) => {
    const i = l.indexOf('=')
    acc[l.slice(0, i).trim()] = l.slice(i + 1).trim()
    return acc
  }, {})

const client = new pg.Client({ connectionString: env.POSTGRESS_DATABASE_URL })
await client.connect()

const c = await client.query(`select count(*)::int c from media`)
console.log('media rows:', c.rows[0].c)

console.log('\n=== FKs referencing media ===')
const fks = await client.query(`
  select
    con.conrelid::regclass::text as src_table,
    (select string_agg(att.attname, ',' order by att.attnum)
       from unnest(con.conkey) k
       join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k) as src_cols
  from pg_constraint con
  where con.contype = 'f' and con.confrelid = 'media'::regclass
  order by 1
`)
console.table(fks.rows)

console.log('\n=== jsonb / richtext-ish columns ===')
const jsonCols = await client.query(`
  select table_name, column_name, data_type
  from information_schema.columns
  where table_schema='public' and data_type in ('jsonb','json')
  order by 1,2
`)
console.table(jsonCols.rows)

await client.end()
