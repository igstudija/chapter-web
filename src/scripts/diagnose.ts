import 'dotenv/config'
import { Client } from 'pg'
import nodemailer from 'nodemailer'
import { checkConfiguration, hasFatal } from '../lib/configCheck'
import { fetchPartner } from '../lib/chapterExchange/fetchPartner'
import { decodeConnectionKey } from '../lib/chapterExchange/connectionKey'

/**
 * Diagnose — the network-touching half of configuration checking.
 *
 * Preflight can tell you a setting is absent. Only this can tell you the value
 * you typed is wrong: that the host does not answer, that the password is
 * rejected, that the bucket you named is private. It runs by hand and never as
 * a side effect, because it is slow and fails without a network. See ADR 0002.
 *
 * Named `diagnose` because pnpm owns `doctor` — ADR 0004.
 *
 * Storage is checked against Supabase specifically. That is the tier 1 path
 * rather than one option among equals (ADR 0001); a tier 3 install has replaced
 * the storage seam and knows it.
 */

type Outcome = { ok: boolean; detail: string; fix?: string; skipped?: boolean }

const SUPABASE_TIMEOUT_MS = 10_000

const report = (label: string, outcome: Outcome): void => {
  const mark = outcome.skipped ? '–' : outcome.ok ? '✓' : '✖'
  console.log(`${mark} ${label}: ${outcome.detail}`)
  if (outcome.fix) console.log(`    ${outcome.fix}`)
}

/**
 * Reaching the database and finding the schema on it are two different
 * questions, and answering them separately is the point — "connection refused"
 * and "relation does not exist" send you to completely different places.
 */
const checkDatabase = async (): Promise<Outcome> => {
  const connectionString = process.env.POSTGRESS_DATABASE_URL
  if (!connectionString) {
    return { ok: false, skipped: true, detail: 'POSTGRESS_DATABASE_URL is not set' }
  }

  // Managed Postgres requires TLS; a container or a box on your own network
  // usually has none. Guessing from the hostname gets tier 2 wrong — anything
  // not literally called localhost was told to use TLS and failed against a
  // server that never offered it. So try TLS, and fall back once if the server
  // says it has none, which is what a client with sslmode=prefer does.
  //
  // rejectUnauthorized is off for the same reason the app does it: managed
  // providers' chains are not in the local trust store. This is a reachability
  // check, not an authenticity one.
  const connect = async (ssl: boolean): Promise<Client> => {
    const client = new Client({
      connectionString,
      ssl: ssl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 10_000,
    })
    await client.connect()
    return client
  }

  let client: Client
  try {
    try {
      client = await connect(true)
    } catch (error) {
      if (!/does not support SSL/i.test((error as Error).message)) throw error
      client = await connect(false)
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { code?: string }

    if (err.code === '28P01' || err.code === '28000') {
      return {
        ok: false,
        detail: 'the server answered but rejected the credentials',
        fix: 'Check the password in POSTGRESS_DATABASE_URL. If it contains @ : / or #, percent-encode it.',
      }
    }
    if (err.code === '3D000') {
      return {
        ok: false,
        detail: 'the server answered but has no such database',
        fix: 'Check the database name at the end of POSTGRESS_DATABASE_URL.',
      }
    }
    if (err.code === 'ENOTFOUND') {
      return { ok: false, detail: 'the host does not resolve', fix: 'Check the hostname.' }
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      return {
        ok: false,
        detail: 'the host does not accept connections',
        fix: 'Check the port, and whether your network can reach it. Supabase direct connections are IPv6-only on newer projects — use a pooler string.',
      }
    }
    return { ok: false, detail: err.message }
  }

  try {
    const { rows } = await client.query<{ name: string }>('select name from payload_migrations')

    // Payload records a push as a migration named `dev`. Once one is there,
    // `pnpm migrate` decides the schema has drifted and opens an interactive
    // "reset?" prompt — which, with no terminal, waits forever and prints
    // nothing. Saying so here is the difference between a known state and an
    // afternoon spent on a command that looks hung.
    if (rows.some((row) => row.name === 'dev')) {
      return {
        ok: true,
        detail: `reachable, schema applied (${rows.length} recorded, one of them a dev push)`,
        fix: 'A dev push has touched this database. `pnpm migrate` will stop to ask whether to reset it, and hang if nothing can answer. Land schema changes by restarting the dev server, or apply a migration SQL by hand.',
      }
    }

    return { ok: true, detail: `reachable, schema applied (${rows.length} migrations recorded)` }
  } catch {
    // Not a failure. This is what a correct install looks like at the moment
    // diagnose is meant to be run — before the schema exists, so that a wrong
    // password or a private bucket is found now rather than three steps later.
    return {
      ok: true,
      skipped: true,
      detail: 'reachable, schema not created yet',
      fix: 'Expected before `pnpm migrate` — run that next. Unexpected afterwards.',
    }
  } finally {
    await client.end()
  }
}

/**
 * Is the database still closed to Supabase's public API roles?
 *
 * Supabase publishes every table in `public` over HTTP to the `anon` role,
 * which is what the anon key — a value that ships in browsers — authenticates
 * as. Row-level security is the only thing in the way, and tables are created
 * without it. Since this project's schema is applied by Payload's dev push, a
 * collection gaining a field is enough to add a table nobody thought about.
 *
 * An event trigger closes those as they appear where the database allowed one
 * to be installed. This is the check that says whether it held.
 */
const checkDataApi = async (): Promise<Outcome> => {
  const connectionString = process.env.POSTGRESS_DATABASE_URL
  if (!connectionString) {
    return { ok: false, skipped: true, detail: 'POSTGRESS_DATABASE_URL is not set' }
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  })

  try {
    await client.connect()
  } catch {
    // The database check above already reported why, in detail. Saying it twice
    // helps nobody.
    return { ok: false, skipped: true, detail: 'the database did not answer' }
  }

  try {
    const { rows: roles } = await client.query<{ present: number }>(
      `select count(*)::int as present from pg_roles where rolname in ('anon', 'authenticated')`,
    )
    if (roles[0].present === 0) {
      return {
        ok: true,
        skipped: true,
        detail: 'not a Supabase database — no roles publish these tables over HTTP',
      }
    }

    const { rows } = await client.query<{ open: number }>(
      `select count(*)::int as open
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind in ('r', 'p')
          and not c.relrowsecurity`,
    )

    if (rows[0].open === 0) {
      return { ok: true, detail: 'every table in public is closed to the anon key' }
    }

    return {
      ok: false,
      detail: `${rows[0].open} table${rows[0].open === 1 ? '' : 's'} in public can be read with the anon key`,
      fix: 'Run: pnpm secure:db --apply',
    }
  } finally {
    await client.end()
  }
}

/**
 * A bucket that exists but is private is the mistake worth catching. Files are
 * served straight from Supabase, so a private bucket does not protect the
 * images — it makes every one of them render broken, and nothing in the symptom
 * points at the cause.
 */
const checkStorage = async (): Promise<Outcome> => {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'media'

  if (!url || !key) {
    return { ok: false, skipped: true, detail: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set' }
  }

  let response: Response
  try {
    response = await fetch(`${url}/storage/v1/bucket/${bucket}`, {
      headers: { Authorization: `Bearer ${key}`, apikey: key },
      signal: AbortSignal.timeout(SUPABASE_TIMEOUT_MS),
    })
  } catch (error) {
    return { ok: false, detail: `could not reach ${url} (${(error as Error).message})` }
  }

  // Supabase Storage answers every one of these with HTTP 400 and puts the
  // status that actually happened in the body, as a string. Reading the HTTP
  // status alone cannot tell a missing bucket from a rejected key.
  const body = (await response.json().catch(() => ({}))) as {
    public?: boolean
    statusCode?: string
    message?: string
  }

  if (!response.ok) {
    const actual = body.statusCode ?? String(response.status)

    if (actual === '404') {
      return {
        ok: false,
        detail: `no bucket named "${bucket}"`,
        fix: `Create it under Storage → New bucket, named "${bucket}", with Public bucket ON.`,
      }
    }
    if (actual === '401' || actual === '403') {
      return {
        ok: false,
        detail: 'the project answered but rejected the key',
        fix: 'SUPABASE_SERVICE_ROLE_KEY must be the service_role key, not the anon key.',
      }
    }
    return { ok: false, detail: `unexpected response ${actual}: ${body.message ?? ''}`.trim() }
  }

  if (!body.public) {
    return {
      ok: false,
      detail: `bucket "${bucket}" exists but is private`,
      fix: 'Make it public. Files are served directly from Supabase, so a private bucket renders every image broken rather than protecting it.',
    }
  }

  return { ok: true, detail: `bucket "${bucket}" exists and is public` }
}

/** Verifies the connection and the credentials without sending anything. */
const checkMail = async (): Promise<Outcome> => {
  const host = process.env.SMTP_HOST
  if (!host) {
    return {
      ok: false,
      skipped: true,
      detail: 'SMTP_HOST is not set — invitations and password resets will not work',
    }
  }

  const port = Number(process.env.SMTP_PORT) || 587
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  })

  try {
    await transporter.verify()
    return { ok: true, detail: `${host}:${port} accepted the connection` }
  } catch (error) {
    return {
      ok: false,
      detail: `${host}:${port} — ${(error as Error).message}`,
      fix: 'Check SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.',
    }
  } finally {
    transporter.close()
  }
}

/**
 * The chapters this install is linked to.
 *
 * A partner that stops answering is dropped from the members list in silence
 * (ADR 0007), which makes this the only place anyone finds out. Read straight
 * from Postgres rather than through Payload: this script never boots the app.
 */
const checkChapterLinks = async (): Promise<Outcome> => {
  const url = process.env.POSTGRESS_DATABASE_URL
  if (!url) return { ok: true, detail: 'no database configured', skipped: true }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()

    const exists = await client.query("SELECT to_regclass('public.chapter_connections') AS t")
    if (!exists.rows[0]?.t) {
      return { ok: true, detail: 'not set up on this install', skipped: true }
    }

    const { rows } = await client.query(
      'SELECT id, name, their_key, paused FROM chapter_connections ORDER BY name',
    )
    if (rows.length === 0) {
      return { ok: true, detail: 'no chapters linked', skipped: true }
    }

    const lines: string[] = []
    let failures = 0

    for (const row of rows) {
      if (row.paused) {
        lines.push(`${row.name}: paused`)
        continue
      }
      if (!row.their_key) {
        // A one-way link is a supported shape, not a fault.
        lines.push(`${row.name}: we share with them, we do not read them`)
        continue
      }
      if (!decodeConnectionKey(row.their_key)) {
        lines.push(`${row.name}: their key is not readable`)
        failures += 1
        continue
      }

      const answer = await fetchPartner({ name: row.name, theirKey: row.their_key })
      if (answer) {
        lines.push(`${row.name}: answered with ${answer.requests.length} request(s)`)
      } else {
        lines.push(`${row.name}: did not answer`)
        failures += 1
      }
    }

    return {
      ok: failures === 0,
      detail: `${rows.length} linked\n    ${lines.join('\n    ')}`,
      fix: failures > 0 ? 'Ask the other chapter whether their install is up, or re-exchange keys.' : undefined,
    }
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : 'could not be read',
    }
  } finally {
    await client.end().catch(() => {})
  }
}

const main = async (): Promise<void> => {
  console.log('\nChecking the infrastructure this install points at.\n')

  const configFindings = checkConfiguration(process.env)
  for (const finding of configFindings) {
    console.log(`${finding.severity === 'fatal' ? '✖' : '⚠'} Configuration: ${finding.message}`)
  }
  if (configFindings.length > 0) console.log('')

  const [database, dataApi, storage, mail, chapterLinks] = await Promise.all([
    checkDatabase(),
    checkDataApi(),
    checkStorage(),
    checkMail(),
    checkChapterLinks(),
  ])

  report('Database', database)
  report('Data API', dataApi)
  report('Storage', storage)
  report('Email', mail)
  report('Chapter links', chapterLinks)

  // Skipped checks are not failures on their own — a missing optional setting
  // is already reported by the configuration pass above, with its real
  // severity. What fails the run is a value that is present and wrong.
  const failed = [database, dataApi, storage, mail, chapterLinks].filter(
    (outcome) => !outcome.ok && !outcome.skipped,
  )

  if (failed.length === 0 && !hasFatal(configFindings)) {
    console.log('\nEverything this can check from here answers correctly.\n')
    process.exit(0)
  }

  console.log(`\n${failed.length} check${failed.length === 1 ? '' : 's'} failed.\n`)
  process.exit(1)
}

main().catch((error) => {
  console.error('\nDiagnosis could not complete:', error instanceof Error ? error.message : error)
  process.exit(1)
})
