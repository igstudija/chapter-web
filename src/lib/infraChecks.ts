import { Client } from 'pg'
import nodemailer from 'nodemailer'

/**
 * Asking the infrastructure whether it is what the configuration claims.
 *
 * These take their values as arguments rather than reading the environment, so
 * that the same check can answer two different questions: `pnpm diagnose` asks
 * about the values already in `.env`, and `pnpm wizard` asks about a value
 * somebody has just typed, before it is written anywhere. One implementation,
 * because "is this database reachable" must not have two answers.
 *
 * Nothing here throws. Every failure is a sentence and, where one exists, the
 * thing to do about it.
 */

export type Outcome = {
  ok: boolean
  detail: string
  /** What to do about it, when that is knowable. */
  fix?: string
  /** Not applicable rather than wrong — reported, but never a failure. */
  skipped?: boolean
}

const SUPABASE_TIMEOUT_MS = 10_000
const CONNECT_TIMEOUT_MS = 10_000

/**
 * Open a connection, whether or not the server speaks TLS.
 *
 * Managed Postgres requires TLS; a container or a box on your own network
 * usually has none. Guessing from the hostname gets tier 2 wrong — anything not
 * literally called localhost was told to use TLS and failed against a server
 * that never offered it. So try TLS, and fall back once if the server says it
 * has none, which is what a client with sslmode=prefer does.
 *
 * `rejectUnauthorized` is off for the same reason the app does it: managed
 * providers' chains are not in the local trust store. These are reachability
 * checks, not authenticity ones.
 */
export const openDatabase = async (connectionString: string): Promise<Client> => {
  const connect = async (ssl: boolean): Promise<Client> => {
    const client = new Client({
      connectionString,
      ssl: ssl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    })
    await client.connect()
    return client
  }

  try {
    return await connect(true)
  } catch (error) {
    if (!/does not support SSL/i.test((error as Error).message)) throw error
    return connect(false)
  }
}

/**
 * Reaching the database and finding the schema on it are two different
 * questions, and answering them separately is the point — "connection refused"
 * and "relation does not exist" send you to completely different places.
 */
export const checkDatabase = async (connectionString?: string): Promise<Outcome> => {
  if (!connectionString) {
    return { ok: false, skipped: true, detail: 'POSTGRESS_DATABASE_URL is not set' }
  }

  let client: Client
  try {
    client = await openDatabase(connectionString)
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { code?: string }

    if (err.code === '28P01' || err.code === '28000') {
      return {
        ok: false,
        detail: 'the server answered but rejected the credentials',
        fix: 'Check the password in the connection string. If it contains @ : / or #, percent-encode it.',
      }
    }
    if (err.code === '3D000') {
      return {
        ok: false,
        detail: 'the server answered but has no such database',
        fix: 'Check the database name at the end of the connection string.',
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
    // the check is meant to be run — before the schema exists, so that a wrong
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
export const checkDataApi = async (connectionString?: string): Promise<Outcome> => {
  if (!connectionString) {
    return { ok: false, skipped: true, detail: 'POSTGRESS_DATABASE_URL is not set' }
  }

  let client: Client
  try {
    client = await openDatabase(connectionString)
  } catch {
    // The database check already reported why, in detail. Saying it twice
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

export interface StorageSettings {
  url?: string
  serviceRoleKey?: string
  bucket?: string
}

/**
 * A bucket that exists but is private is the mistake worth catching. Files are
 * served straight from Supabase, so a private bucket does not protect the
 * images — it makes every one of them render broken, and nothing in the symptom
 * points at the cause.
 */
export const checkStorage = async ({
  url: rawUrl,
  serviceRoleKey: key,
  bucket = 'media',
}: StorageSettings): Promise<Outcome> => {
  const url = rawUrl?.replace(/\/+$/, '')

  if (!url || !key) {
    return {
      ok: false,
      skipped: true,
      detail: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set',
    }
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
        fix: 'This must be the service_role key, not the anon key.',
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

export interface MailSettings {
  host?: string
  port?: string | number
  user?: string
  pass?: string
}

/** Verifies the connection and the credentials without sending anything. */
export const checkMail = async ({ host, port, user, pass }: MailSettings): Promise<Outcome> => {
  if (!host) {
    return {
      ok: false,
      skipped: true,
      detail: 'SMTP_HOST is not set — invitations and password resets will not work',
    }
  }

  const portNumber = Number(port) || 587
  const transporter = nodemailer.createTransport({
    host,
    port: portNumber,
    secure: portNumber === 465,
    auth: user ? { user, pass } : undefined,
    connectionTimeout: CONNECT_TIMEOUT_MS,
    greetingTimeout: CONNECT_TIMEOUT_MS,
  })

  try {
    await transporter.verify()
    return { ok: true, detail: `${host}:${portNumber} accepted the connection` }
  } catch (error) {
    return {
      ok: false,
      detail: `${host}:${portNumber} — ${(error as Error).message}`,
      fix: 'Check the host, port, user and password.',
    }
  } finally {
    transporter.close()
  }
}
