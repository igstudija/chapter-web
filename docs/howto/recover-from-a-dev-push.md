# Recover from a dev push

## The symptom

`pnpm migrate` prints something like *"It looks like you've run Payload in dev
mode, meaning you've dynamically pushed changes to your database… Would you like
to proceed?"* — or, with no terminal to ask in (a deploy, CI, a script), it
prints nothing and never finishes.

`pnpm diagnose` names it on the database line: *"schema applied (… one of them a
dev push)"*.

## What happened

`pnpm dev` was started against this database. In development Payload writes the
schema straight from the code instead of applying `src/migrations`, and records
that as a migration named `dev` (batch −1). The migrations it skipped are not
recorded at all. From then on `pnpm migrate` sees a database it cannot account
for, and offers to reset it — which would delete everything.

The most common way here: one connection string in `.env` for everything, as the
deploy guide recommends, and a developer running `pnpm dev` on their laptop —
against production.

## The fix

```bash
pnpm migrate:reconcile           # look first
pnpm migrate:reconcile --apply   # then do it
pnpm migrate                     # should now report nothing to run
```

Run it with `.env` pointing at the affected database (the session pooler, port
5432, on Supabase).

It compares the live schema with the code before touching anything. If the
only differences are cosmetic — column defaults, constraint or index names — it
deletes the `dev` row and records every migration that is not recorded, each in
its own batch, in one transaction. The schema and the data are not changed. A
dry run prints the differences it found and what it would record.

**It refuses** when a column or table is missing, extra or renamed, because
recording a migration that did not happen would hide exactly that. Then:

1. Read the `ADD COLUMN` / `CREATE TABLE` lines it printed — that is what the
   database lacks.
2. Find the migration in `src/migrations` that adds them and run its SQL by hand
   (`psql` or the Supabase SQL editor). Most migrations here use
   `IF NOT EXISTS`, so re-running one is safe.
3. Run `pnpm migrate:reconcile` again.

A line that *drops* a column or table means the database has something the code
does not — usually a newer checkout pushed it. Update your code before doing
anything else.

### When the database is only reachable from the host

Some platforms keep the production connection string as a secret you cannot
read back (Vercel's *sensitive* variables). Run it as a one-off build step
instead — see [Run migrations in production](run-migrations-in-production.md#from-the-hosts-build-step),
with `pnpm migrate:reconcile --apply && pnpm migrate` as the command.

## Keeping it from happening again

- **Do not point a dev server at production.** Use a second Supabase project, or
  a local Postgres (`docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432
  postgres:16`), for `pnpm dev`.
- If you must, set `PAYLOAD_DB_PUSH=false` in that `.env`. The dev server then
  leaves the schema alone, and new fields need `pnpm migrate` like anywhere
  else.
- `pnpm test:int` is safe either way: push is limited to an actual dev server.
