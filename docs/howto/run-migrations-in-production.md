# Run migrations in production

A release that changes the schema ships a file in `src/migrations`. The
production database has to get it **before** the code that needs it goes live:
Payload names every column it knows in its queries, so a build that expects a
column the database lacks answers 500 on whatever touches that table.

Migrations here are written to be safe to run ahead of the deploy — they add,
they do not remove — so the order is always: migrate, then deploy.

## Is there anything to run?

```bash
pnpm payload migrate:status
```

Every row should say `Yes` under *Ran*. Any `No` is a migration production has
not had.

If `pnpm migrate` instead stops to ask whether to reset the database, stop and
read [Recover from a dev push](recover-from-a-dev-push.md). Never answer yes.

## From your machine

With `.env` pointing at production through the **session pooler** (port 5432 on
Supabase — migrations hold state across statements, which the transaction
pooler does not keep):

```bash
pnpm migrate
pnpm secure:db --check
```

`secure:db --check` matters on Supabase whenever a migration creates a table:
whether the new table arrives closed to the public API depends on a trigger some
projects do not allow. It exits non-zero if anything is open, and
`pnpm secure:db --apply` closes it.

## From the host's build step

When the production connection string is a secret you cannot read back — on
Vercel, a variable marked *sensitive* — run the migration where it lives: in a
one-off build.

Do not make this the project's permanent build command: every preview deployment
would then run migrations against production. Use it once, from a copy of the
code:

```bash
# A throwaway copy of the release you are about to deploy.
git clone --depth 1 https://github.com/igstudija/chapter-web.git /tmp/release
cd /tmp/release
rm -rf .git                      # see "Deploy blocked" below
vercel link                      # pick the production project
```

Give that copy a `vercel.json` with the build command overridden — keep the
other settings from the repository's own file:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "regions": ["fra1"],
  "fluid": true,
  "buildCommand": "PG_POOLER_PORT=as-given pnpm migrate < /dev/null && PG_POOLER_PORT=as-given pnpm secure:db --check && pnpm payload migrate:status < /dev/null && pnpm build"
}
```

```bash
vercel deploy --prod
```

`PG_POOLER_PORT=as-given` keeps the session pooler for the migration — a build on Vercel counts as serverless, and the app would otherwise switch to the transaction pooler. `< /dev/null` is the important part: if anything wants to ask a question, it
fails the build instead of hanging until the build times out. The build log
shows each migration as it runs and the status table at the end. Delete the
copy afterwards; the next ordinary deploy uses the normal build command again.

### Deploy blocked: "the commit author is not a member of the team"

On a Vercel Hobby team, a deployment whose git commit was authored by someone
outside the team is refused. A CLI deploy from a directory without `.git` carries
no author, which is why the copy above removes it. The lasting fix is to add the
author to the team, or to deploy from an account that is in it.

## Rolling back

```bash
pnpm payload migrate:down
```

rolls back the most recent batch — everything the last `pnpm migrate` applied. Deploy the previous release's code first if the newer code
depends on what you are removing.
