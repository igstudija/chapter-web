# The database is closed to Supabase's API roles

A Supabase project publishes every table in the `public` schema over HTTP, and
grants two roles — `anon` and `authenticated` — a blanket `SELECT, INSERT,
UPDATE, DELETE` on all of them. `anon` is what the anon key authenticates as,
and the anon key is a public value by design: it ships in browsers, it appears
in dashboards, it is not a secret. The only thing between that role and the data
is row-level security, and Postgres creates tables with RLS off.

Payload knows none of this. It creates its tables over a plain Postgres
connection, and Supabase's grants attach to them as they appear. This install
ran that way: 65 tables, RLS off, full grants — every member's contact details,
every audit log entry, and the `users` table with its password hashes, readable
*and writable* by anyone holding a key that was never meant to protect anything.

So **every table in `public` has row-level security on, and no policies.**

The usual Supabase answer is RLS plus a policy per table saying who may see
what. That is for an application whose browser talks to the database directly.
This one never does: every read and write goes through Payload, which applies
its own access control, over a connection that authenticates as `postgres`. The
correct policy set for a role that should not be reaching these tables at all is
the empty one — RLS with no policies denies everything.

`postgres` carries `BYPASSRLS`, so none of this is visible to the application.
Worth stating plainly, because turning on RLS across 65 tables sounds like it
must change something: it changes nothing about how the site behaves.

The grants and the schema's `USAGE` are revoked as well, along with the default
privileges that would re-grant them on the next table. Two independent reasons
to deny beat one — with the grants gone, a permissive policy added by mistake
later is a permission error rather than a disclosure.

## Keeping it that way

This project's schema is applied by Payload's dev push rather than by
migrations, so a collection gaining a field is enough to create a table nobody
thought about — RLS off, freshly granted, exactly as before. A one-time fix
would last until the next field.

An **event trigger** (`rls_auto_enable`) therefore enables RLS and revokes the
API grants on tables as they are created. Installing it needs privileges the
database may not give out, so it is attempted rather than required.
`pnpm secure:db --apply` is the fallback and the repair, `pnpm secure:db
--check` fails a build on drift, and `pnpm diagnose` reports it under *Data
API*.

## The Data API itself is off

Since nothing in this codebase calls `/rest/v1/`, the Data API is also disabled
at the project level (Supabase dashboard → Integrations → Data API). Storage is
a separate service on `/storage/v1/` and is unaffected; that is the only Supabase
HTTP API the application uses, and it authenticates with the service-role key.

That is a belt on top of braces, not a replacement for them. The switch lives in
a dashboard rather than in this repository, it is one click from being flipped
back, and it does not travel to a self-hoster's own project. The database has to
be safe on its own terms, which is what everything above is for.

## Consequences

Supabase's Security Advisor moves the 65 findings from *error* (“RLS Disabled in
Public”) to *info* (“RLS Enabled No Policy”). The informational ones are the
intended state and should not be “fixed” by adding policies — a policy here
would be the first crack in the rule that nothing but Payload reaches this data.

They do not go away, and are not meant to. Disabling the Data API does not clear
them; the advisor reports on the schema regardless, and its info entries cannot
be dismissed. A permanently non-empty *Info* tab is the price of the
architecture. Read it as a description, not a backlog.

An install that later *does* want to query Supabase from the browser cannot
simply switch it on. It has to grant, and write policies, deliberately, per
table — which is the point.

A tier 2 install on plain Postgres has no `anon` role, no PostgREST and nothing
to close; `pnpm secure:db` detects that and does nothing rather than enabling
RLS on 65 tables to guard a door that was never there (ADR 0001).
