import 'dotenv/config'
import { Client } from 'pg'
import nodemailer from 'nodemailer'
import { checkConfiguration, hasFatal } from '../lib/configCheck'

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
    const { rows } = await client.query<{ count: string }>(
      'select count(*)::text as count from payload_migrations',
    )
    return { ok: true, detail: `reachable, schema applied (${rows[0].count} migrations recorded)` }
  } catch {
    return {
      ok: false,
      detail: 'reachable, but the schema has not been created',
      fix: 'Run: pnpm migrate',
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

const main = async (): Promise<void> => {
  console.log('\nChecking the infrastructure this install points at.\n')

  const configFindings = checkConfiguration(process.env)
  for (const finding of configFindings) {
    console.log(`${finding.severity === 'fatal' ? '✖' : '⚠'} Configuration: ${finding.message}`)
  }
  if (configFindings.length > 0) console.log('')

  const [database, storage, mail] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkMail(),
  ])

  report('Database', database)
  report('Storage', storage)
  report('Email', mail)

  // Skipped checks are not failures on their own — a missing optional setting
  // is already reported by the configuration pass above, with its real
  // severity. What fails the run is a value that is present and wrong.
  const failed = [database, storage, mail].filter((outcome) => !outcome.ok && !outcome.skipped)

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
