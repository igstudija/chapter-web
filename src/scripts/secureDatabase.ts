import 'dotenv/config'
import { Client } from 'pg'

/**
 * Close the database to Supabase's public API roles.
 *
 *   pnpm secure:db            report what is open, change nothing
 *   pnpm secure:db --apply    close it
 *   pnpm secure:db --check    report, and exit 1 if anything is open (CI)
 *
 * ## What this is for
 *
 * A Supabase project publishes every table in the `public` schema through
 * PostgREST, and hands two roles — `anon` and `authenticated` — a blanket grant
 * on all of them. `anon` is the role behind the anon key, which is a public
 * value by design: it ships in browsers, it appears in dashboards, it is not a
 * secret. The only thing standing between that role and the data is row-level
 * security, and Postgres creates tables with RLS off.
 *
 * Payload does not know any of this. It creates its tables over a plain
 * Postgres connection, RLS off, and Supabase's grants attach to them as they
 * appear. The result is a database whose every row — `users` and its password
 * hashes included — is readable and writable by anyone holding a key that was
 * never meant to protect anything. Supabase's Security Advisor reports this as
 * one "RLS Disabled in Public" error per table.
 *
 * ## Why no policies
 *
 * The usual Supabase answer is RLS plus a policy per table describing who may
 * see what. That is for an app whose browser talks to the database directly.
 * This one never does: every read and write goes through Payload, which applies
 * its own access control and connects as `postgres`. So the correct policy set
 * is the empty one. RLS with no policies denies everything, which is exactly
 * right for a role that should not be reaching these tables at all.
 *
 * `postgres` carries BYPASSRLS, so none of this is visible to the application.
 * That is worth stating plainly because it looks alarming: turning on RLS
 * across 65 tables changes nothing about how the site behaves.
 *
 * ## Belt and braces
 *
 * RLS alone satisfies the advisor. This also revokes the grants themselves and
 * the schema's USAGE, because two independent reasons to deny beat one — an
 * accidental permissive policy later stops being a data breach and starts being
 * a permission error. Nothing here touches the `storage` schema, which the
 * upload path reaches with the service-role key.
 *
 * ## Why it is re-runnable
 *
 * This project's schema is applied by Payload's dev push rather than by
 * migrations, so new tables appear whenever a collection grows a field — RLS
 * off, freshly granted. An event trigger picks those up automatically where the
 * database allows one to be created; where it does not, this script is the
 * answer and `pnpm diagnose` will tell you it needs running.
 */

type Mode = 'report' | 'apply' | 'check'

/** The two roles Supabase puts behind its public API. */
const API_ROLES = ['anon', 'authenticated'] as const

interface Open {
  tablesWithoutRls: string[]
  grantedTables: number
  schemaUsage: string[]
  executableDefiners: string[]
}

const connect = async (connectionString: string): Promise<Client> => {
  // Same shape as `diagnose`: try TLS, fall back once if the server says it has
  // none. Managed Postgres requires TLS; a container on your own network has no
  // certificate to offer.
  const attempt = async (ssl: boolean): Promise<Client> => {
    const client = new Client({
      connectionString,
      ssl: ssl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 15_000,
    })
    await client.connect()
    return client
  }

  try {
    return await attempt(true)
  } catch (error) {
    if (!/does not support SSL/i.test((error as Error).message)) throw error
    return attempt(false)
  }
}

/**
 * Does this database have Supabase's API roles at all?
 *
 * A tier 2 install on plain Postgres has no `anon`, no PostgREST and nothing to
 * close — telling it to enable RLS on 65 tables would be noise about a door it
 * does not have. Detect rather than assume (ADR 0001).
 */
const hasApiRoles = async (client: Client): Promise<boolean> => {
  const { rows } = await client.query<{ present: number }>(
    `select count(*)::int as present from pg_roles where rolname = any($1)`,
    [[...API_ROLES]],
  )
  return rows[0].present > 0
}

const survey = async (client: Client): Promise<Open> => {
  const tables = await client.query<{ relname: string }>(
    `select c.relname
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
        and not c.relrowsecurity
      order by 1`,
  )

  const grants = await client.query<{ tables: number }>(
    `select count(distinct table_name)::int as tables
       from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = any($1)`,
    [[...API_ROLES]],
  )

  // Direct grants only. `has_schema_privilege` would also answer yes for the
  // `GRANT USAGE ON SCHEMA public TO PUBLIC` that Postgres creates a database
  // with, which every role in the cluster holds — revoking that is a
  // database-wide change with Supabase's own service roles inside the blast
  // radius, and it buys nothing once no table in the schema is granted.
  const usage = await client.query<{ grantee: string }>(
    `select distinct r.rolname as grantee
       from pg_namespace n
       cross join unnest(coalesce(n.nspacl, '{}'::aclitem[])) as entry
       join pg_roles r on r.rolname = split_part(entry::text, '=', 1)
      where n.nspname = 'public'
        and r.rolname = any($1)`,
    [[...API_ROLES]],
  )

  // A SECURITY DEFINER function runs as whoever wrote it, so RLS is no backstop
  // here and the effective privilege is what counts — including EXECUTE handed
  // to PUBLIC, which `create function` does by default.
  const definers = await client.query<{ signature: string }>(
    `select p.oid::regprocedure::text as signature
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prosecdef
        and exists (
          select 1 from unnest($1::text[]) as role
           where has_function_privilege(role, p.oid, 'EXECUTE')
        )
      order by 1`,
    [[...API_ROLES]],
  )

  return {
    tablesWithoutRls: tables.rows.map((row) => row.relname),
    grantedTables: grants.rows[0].tables,
    schemaUsage: usage.rows.map((row) => row.grantee),
    executableDefiners: definers.rows.map((row) => row.signature),
  }
}

const enableRls = async (client: Client, tables: string[]): Promise<void> => {
  for (const table of tables) {
    // Identifier interpolation, not a value — parameters cannot appear here.
    // The names come from pg_class, so they are already whatever Postgres
    // considers valid; quote_ident keeps the odd ones intact.
    const { rows } = await client.query<{ ident: string }>(
      `select quote_ident($1) as ident`,
      [table],
    )
    await client.query(`alter table public.${rows[0].ident} enable row level security`)
  }
}

const revokeGrants = async (client: Client): Promise<void> => {
  const roles = API_ROLES.join(', ')

  await client.query(`revoke all on all tables in schema public from ${roles}`)
  await client.query(`revoke all on all sequences in schema public from ${roles}`)
  await client.query(`revoke all on all functions in schema public from ${roles}`)
  await client.query(`revoke usage on schema public from ${roles}`)

  // Existing objects are only half of it. Supabase also sets default privileges
  // so that anything created later is granted on creation, which would quietly
  // re-open every table the next dev push adds.
  for (const owner of ['postgres', 'supabase_admin']) {
    for (const kind of ['tables', 'sequences', 'functions']) {
      try {
        await client.query(
          `alter default privileges for role ${owner} in schema public revoke all on ${kind} from ${roles}`,
        )
      } catch (error) {
        // Altering another role's defaults needs membership in it. `postgres`
        // has that for itself and usually not for `supabase_admin`; the tables
        // Payload creates are owned by `postgres`, so missing the second one
        // costs nothing.
        const code = (error as { code?: string }).code
        if (code !== '42501') throw error
      }
    }
  }
}

/**
 * Teach the database to do this to new tables by itself.
 *
 * Creating an event trigger is a superuser operation, and Supabase's `postgres`
 * is not a superuser — so this is attempted, not required. Where it works, a
 * collection gaining a field never reopens the database; where it does not,
 * `pnpm secure:db --apply` after a schema change is the whole of the fallback.
 */
const installEventTrigger = async (client: Client): Promise<boolean> => {
  const roles = API_ROLES.join(', ')

  await client.query(`
    create or replace function public.rls_auto_enable()
      returns event_trigger
      language plpgsql
      security definer
      set search_path = pg_catalog
    as $$
    declare
      created record;
    begin
      for created in
        select object_identity
          from pg_event_trigger_ddl_commands()
         where command_tag = 'CREATE TABLE'
           and schema_name = 'public'
      loop
        execute format('alter table %s enable row level security', created.object_identity);
        execute format('revoke all on %s from ${roles}', created.object_identity);
      end loop;
    end;
    $$;
  `)

  // `create function` grants EXECUTE to PUBLIC, which undoes the revoke above
  // and puts a SECURITY DEFINER function within reach of the anon key. Calling
  // an event-trigger function directly fails anyway, but a definer function the
  // world may execute is the kind of thing that stops being harmless the moment
  // its body changes — and the advisor is right to say so.
  await client.query(`revoke all on function public.rls_auto_enable() from public`)
  await client.query(`revoke all on function public.rls_auto_enable() from ${roles}`)

  try {
    await client.query(`drop event trigger if exists rls_auto_enable`)
    await client.query(`
      create event trigger rls_auto_enable
        on ddl_command_end
        when tag in ('CREATE TABLE')
        execute function public.rls_auto_enable()
    `)
    return true
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === '42501') return false
    throw error
  }
}

const describe = (open: Open): void => {
  const { tablesWithoutRls, grantedTables, schemaUsage, executableDefiners } = open

  if (tablesWithoutRls.length === 0) {
    console.log('✓ row-level security: on for every table in public')
  } else {
    console.log(
      `✖ row-level security: off on ${tablesWithoutRls.length} ` +
        `${tablesWithoutRls.length === 1 ? 'table' : 'tables'} in public`,
    )
    const sample = tablesWithoutRls.slice(0, 8).join(', ')
    const more = tablesWithoutRls.length > 8 ? `, and ${tablesWithoutRls.length - 8} more` : ''
    console.log(`    ${sample}${more}`)
  }

  if (grantedTables === 0) {
    console.log(`✓ table grants: ${API_ROLES.join(' and ')} hold none in public`)
  } else {
    console.log(
      `✖ table grants: ${API_ROLES.join(' and ')} can reach ${grantedTables} ` +
        `${grantedTables === 1 ? 'table' : 'tables'} in public`,
    )
  }

  if (schemaUsage.length === 0) {
    console.log('✓ schema usage: no grant on the public schema names the API roles')
  } else {
    console.log(`✖ schema usage: the public schema is granted to ${schemaUsage.join(' and ')}`)
  }

  if (executableDefiners.length === 0) {
    console.log('✓ definer functions: none in public can be executed by the API roles')
  } else {
    console.log(
      `✖ definer functions: ${executableDefiners.length} SECURITY DEFINER ` +
        `${executableDefiners.length === 1 ? 'function' : 'functions'} in public can be executed`,
    )
    console.log(`    ${executableDefiners.join(', ')}`)
  }
}

async function main(): Promise<void> {
  const mode: Mode = process.argv.includes('--apply')
    ? 'apply'
    : process.argv.includes('--check')
      ? 'check'
      : 'report'

  const connectionString = process.env.POSTGRESS_DATABASE_URL
  if (!connectionString) {
    console.error('POSTGRESS_DATABASE_URL is not set. Nothing to connect to.')
    process.exit(1)
  }

  const client = await connect(connectionString)

  try {
    if (!(await hasApiRoles(client))) {
      console.log(
        'This database has no `anon` or `authenticated` role, so nothing publishes\n' +
          'its tables over HTTP and there is nothing to close. Skipping.',
      )
      return
    }

    const before = await survey(client)
    describe(before)

    const closed =
      before.tablesWithoutRls.length === 0 &&
      before.grantedTables === 0 &&
      before.schemaUsage.length === 0 &&
      before.executableDefiners.length === 0

    if (mode !== 'apply') {
      if (!closed) {
        console.log('\nRun `pnpm secure:db --apply` to close it.')
        if (mode === 'check') process.exitCode = 1
      }
      return
    }

    if (!closed) console.log('')

    await enableRls(client, before.tablesWithoutRls)
    await revokeGrants(client)
    const triggerInstalled = await installEventTrigger(client)

    const after = await survey(client)
    describe(after)

    console.log('')
    if (triggerInstalled) {
      console.log(
        'An event trigger now enables row-level security on tables as they are\n' +
          'created, so a dev push cannot reopen the database.',
      )
    } else {
      console.log(
        'This database would not let us create an event trigger (that needs a\n' +
          'superuser, which Supabase\'s `postgres` is not). New tables will arrive\n' +
          'with row-level security off — run this again after a schema change.\n' +
          '`pnpm diagnose` checks for it.',
      )
    }
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error(`\nsecure:db failed: ${(error as Error).message}`)
  process.exit(1)
})
