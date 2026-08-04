# Deploying to Vercel + Supabase

Supabase provides the database and the file storage; Vercel runs the app. This
is the fastest way to get an install running without a server to maintain, and
it is what the repository is configured for out of the box.

Read [What this setup cannot do](#what-this-setup-cannot-do) before committing
to it — there is one real limitation, around upload size, that does not exist on
a normal server.

**Time:** about 30 minutes, most of it waiting for Supabase to provision.

**You need:** a [Supabase](https://supabase.com) account, a
[Vercel](https://vercel.com) account, this repository pushed to GitHub/GitLab/
Bitbucket, and Node 20.9+ with pnpm 9 or 10 on your own machine (the database
schema is created from there, once).

---

## 1. Create the Supabase project

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Give it a name, generate a **database password** and save it somewhere — it
   appears once and is part of every connection string below.
3. Pick the region closest to your members. Vercel's region is set to match in
   step 5; the two being far apart is the single biggest avoidable source of
   slowness, because every page render makes several database round trips.
4. Wait for provisioning (~2 minutes).

## 2. Create the storage bucket

**Storage** → **New bucket**:

- **Name:** `media`
- **Public bucket:** **on**

Public is required, not a shortcut. Files are served straight from Supabase and
never pass back through the app, so a private bucket does not protect the
images — it makes every one of them render broken. Member photos, event images
and logos are public content by nature; anything genuinely sensitive does not
belong in the Media collection.

## 3. Collect the credentials

From **Project Settings**:

| Value | Where | Used as |
|---|---|---|
| Project URL | **API** → Project URL (**Data API** in newer dashboards) | `SUPABASE_URL` |
| `service_role` key | **API** → Project API keys → `service_role`, click to reveal (**API Keys** in newer dashboards) | `SUPABASE_SERVICE_ROLE_KEY` |
| Connection string | **Database** → Connection string, or the **Connect** button in the top bar | `POSTGRESS_DATABASE_URL` |

The `service_role` key bypasses row-level security. It is a server-side secret:
never prefix it `NEXT_PUBLIC_`, never commit it, never send it to a browser.

**Connect** offers three connection strings, and picking the wrong one is the
most common way this deployment fails:

| String | Host / port | Use it for |
|---|---|---|
| Direct | `db.PROJECT.supabase.co:5432` | Nothing here. On newer projects this is **IPv6-only**, and Vercel's functions are IPv4 — connections time out with no useful error. |
| Session pooler | `...pooler.supabase.com:5432` | **This one.** Copy it once and use it everywhere. |
| Transaction pooler | `...pooler.supabase.com:6543` | The same host on a different port; the app switches to it by itself when it runs serverless. |

The two pooler ports are not interchangeable, and which one is right depends on
the host rather than on you. Serverless needs 6543: each function instance is
short-lived and opens its own connections, and the transaction pooler
multiplexes them onto a handful of real Postgres backends. Without it, moderate
traffic exhausts the connection limit and the site starts returning 500s under
exactly the load you wanted it to handle. Migrations need 5432, because they
hold locks and temporary state across statements and the transaction pooler is
free to answer each one from a different backend.

Copy the string the dashboard shows rather than typing one from the examples
below — the pooler's hostname and the `postgres.PROJECT` username differ per
project and per region.

**You only need one of these strings.** Take the session pooler one and use it
both locally and in your deploy: the app rewrites the port to whichever the host
it starts on requires, and logs a line saying it did. That is deliberate. Which
port is correct depends on the host and not on the person configuring it, and
the version of this that asked you to keep two values straight is what put this
project's own production on the session pooler — where it ran out of connections
under load, hours after a deploy that looked fine.

`PG_POOLER_PORT=as-given` disables the rewriting, for an install that has a
reason to choose for itself.

Replace `[YOUR-PASSWORD]` in the string with the password from step 1. If it
contains `@`, `:`, `/` or `#`, percent-encode those characters — `@` becomes
`%40` — or the URL parses wrongly and you get an authentication error naming a
username you never typed.

## 4. Create the schema and the first account

The schema is created once, from your machine, before the first deploy. Vercel's
build step is not the place for it: preview deployments would run migrations
against production too.

```bash
git clone https://github.com/igstudija/chapter-web.git
cd chapter-web
pnpm install
cp .env.example .env
```

Fill in `.env` with the values from step 3, using the **session pooler** string
(port 5432) for `POSTGRESS_DATABASE_URL`, and cap the pool — that pooler allows
15 clients and the app defaults to 50. Generate the secret with
`openssl rand -base64 32`:

```bash
PAYLOAD_SECRET=<openssl rand -base64 32>
POSTGRESS_DATABASE_URL=postgresql://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
SUPABASE_STORAGE_BUCKET=media
NEXT_PUBLIC_SERVER_URL=http://localhost:3050
PG_POOL_MAX=5
```

Then either run `pnpm wizard`, which asks for each of those values, checks it
before moving on and runs everything below in order — or do it by hand:

```bash
pnpm diagnose          # checks the values above actually work
pnpm migrate           # creates the schema — applies the migrations in src/migrations
pnpm secure:db --apply # closes the tables to Supabase's public API
pnpm bootstrap         # creates your settings + administrator account
pnpm seed:policies     # fills the three policy pages the footer links to
```

**Do not run `pnpm dev` before `pnpm migrate`.** In development Payload writes
the schema itself instead of applying the migrations, and records it as a
migration named `dev`. After that, `pnpm migrate` decides the schema has drifted
and stops to ask whether to reset the database — with nothing at the keyboard it
waits forever, printing nothing. Recovering means applying migration SQL by
hand. Running the commands in the order above avoids it entirely.

`pnpm seed:policies` is not optional in the way its name suggests. The footer
links to Terms, Privacy and Cookie policy from every page, and with no templates
those pages render a heading over an empty body. A blank privacy policy on a
site collecting members' contact details is worse than no page at all. The
skeletons need editing before launch, and say so in brackets.

Run `pnpm diagnose` before the rest. Three of this page's most common failures —
the wrong connection string, the anon key pasted where the `service_role` key
belongs, and a bucket left private — are each one line of its output, and each
is otherwise discovered much later and much less clearly.

### Close the database to the public API

**Do not skip `pnpm secure:db --apply`, and do not leave it until later.**

Supabase publishes every table in the `public` schema as a REST API, and grants
the `anon` role read *and write* access to all of them. `anon` is the role behind
the anon key, which is a public value by design — it ships in browsers and is
printed in your own dashboard. The only thing standing between it and your data
is row-level security, and Postgres creates tables with row-level security off.

Payload does not know any of this. It creates its tables over a plain Postgres
connection, and Supabase's grants attach to them as they appear. Between
`pnpm migrate` and this command, every member's contact details and the `users`
table with its password hashes are readable and writable by anybody who knows
your project's URL.

The command turns row-level security on for every table, writes no policies —
nothing but the app should be reaching these tables, so the correct policy set is
the empty one — revokes the grants, and installs a trigger so tables created
later start closed too. Your app is unaffected: it connects as `postgres`, which
bypasses row-level security. Running it twice is harmless.

Then turn the API off entirely, since nothing here uses it:

**Integrations** → **Data API** → **Enable Data API** → off → **Save**.

Storage lives on a different endpoint (`/storage/v1/`) and keeps working; only
table access over HTTP goes away. Skip this if you plan to query Supabase from
browser code — but then the empty policy set above is no longer right for you,
and you will need to write policies deliberately, per table.

Afterwards, Supabase's **Advisors** → **Security Advisor** should report zero
errors and zero warnings. Its *Info* tab will list every table as “RLS Enabled No
Policy”, permanently. That is the intended state, not a leftover — see
[ADR 0006](adr/0006-the-database-is-closed-to-supabases-api-roles.md).

`pnpm bootstrap` asks for the organisation name and the administrator's email and
password. Everything else is configured from the admin panel afterwards.

Keep `PAYLOAD_SECRET` somewhere safe. It signs session tokens: changing it later
logs every user out.

Confirm it worked before going near Vercel:

```bash
pnpm dev    # then open http://localhost:3050/admin and log in
```

## 5. Create the Vercel project

1. [vercel.com/new](https://vercel.com/new) → import the repository.
2. **Framework preset:** Next.js. Leave the build and install commands alone.
   `vercel.json` in the repository sets the region and enables fluid compute,
   which lets concurrent requests share an instance — fewer cold starts and,
   more usefully here, fewer database connections.
3. Expand **Environment Variables** and add the ones below *before* the first
   deploy. A deploy without them fails at build time, because the storage
   adapter refuses to construct without its configuration.

```bash
PAYLOAD_SECRET=<the same value as in .env>
POSTGRESS_DATABASE_URL=<the same value as in .env>
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
SUPABASE_STORAGE_BUCKET=media
NEXT_PUBLIC_SERVER_URL=https://your-domain.org

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=<smtp user>
SMTP_PASS=<smtp password>
EMAIL_FROM=noreply@your-domain.org
EMAIL_FROM_NAME=Your Organisation
```

Two things differ from your local `.env`, and the connection string is not one
of them — paste the same value here. `NEXT_PUBLIC_SERVER_URL` is your domain
where it was `localhost:3050` locally, and it is compiled into the build, so
getting it wrong means invitation links pointing at a laptop and a rebuild to
fix it. `PG_POOL_MAX` is absent here on purpose: the app already drops its pool
to a serverless size on its own, while locally you set it low to stay under the
session pooler's client limit.

Email is not optional in practice: invitations, password resets and
notifications all go through SMTP, and an install without it cannot onboard a
single member. Any SMTP provider works; this project is developed against
[Mailjet](https://www.mailjet.com), whose free tier covers a chapter:

| Setting | Where it comes from |
| --- | --- |
| `SMTP_HOST` | `in-v3.mailjet.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Account settings → REST API → **API Key** |
| `SMTP_PASS` | the matching **Secret Key** |

Verify `EMAIL_FROM` under **Account settings → Sender addresses** first.
Providers drop mail sent as an address they have not authorised, and they drop
it silently.

`NEXT_PUBLIC_*` variables are compiled into the build. Changing one later
requires a redeploy, not just a restart.

4. **Deploy.** The first build takes 3–6 minutes.

### Set the region to match Supabase

`vercel.json` pins `fra1` (Frankfurt). If your Supabase project is elsewhere,
change it to the matching Vercel region and redeploy — `iad1` for US East,
`sfo1` for US West, `sin1` for Singapore. The
[full list](https://vercel.com/docs/regions) is in Vercel's docs.

Cross-continent, each database round trip costs 100ms or more and a single admin
list view makes several. This is worth getting right.

## 6. Point the domains at it

In the Vercel project, **Settings** → **Domains**, add `your-domain.org` with
the DNS records Vercel shows you.

Then check `NEXT_PUBLIC_SERVER_URL` matches it. It is used in emails and
absolute links, so a wrong value means invitation links that go nowhere. It is
compiled into the build, so changing it requires a redeploy — not just a
restart.

Vercel's own DNS is enough. Putting Cloudflare or another CDN in front is
supported but buys little here: Vercel already serves the static assets from its
edge, and uploads come straight from Supabase rather than through the app. If
you do proxy, the rate limiter reads `cf-connecting-ip`, so it keeps seeing real
visitor addresses rather than the proxy's.

## 7. Check it end to end

- `https://your-domain.org/api/health` → `{"status":"ok","db":"ok"}`. If `db`
  says `error`, the connection string is wrong — see the table in step 8.
- `https://your-domain.org/admin` → log in with the account from `pnpm bootstrap`.
- Upload an image in **Media**. It should appear in the Supabase Storage bucket
  under `media/`, along with `-thumbnail`, `-card` and `-medium` versions
  generated a few seconds later.
- Trigger a password reset and confirm the email arrives, with a link pointing
  at the right domain.

---

## What this setup cannot do

**Uploads are capped at ~4.5MB.** Vercel rejects request bodies larger than that
at its edge, before any application code runs. The app defaults its own limits
to 4MB when it detects a serverless host, so users get a clear "File too large"
message instead of an unexplained failure — but the ceiling is Vercel's and no
setting here lifts it. Larger files have to be uploaded through the Supabase
dashboard directly.

If members routinely upload originals straight off a camera, this is the reason
to run on a normal server instead ([Docker](../README.md#docker)), where the
limits are 15MB for images and 50MB for audio.

**Free-tier Supabase projects pause after a week of inactivity.** The site
returns 500s until you resume it from the dashboard. Fine for a staging install,
not for a live one.

**Log files do not exist.** Vercel's filesystem is read-only, so the app writes
logs to the console only and Vercel's own log viewer is where they live. There
is nothing to configure; the in-app log reader is simply empty there.

---

## Keeping it running

**Deploying changes.** Push to your default branch; Vercel builds and deploys.
Other branches get preview deployments.

Preview does **not** inherit Production's environment variables — each variable
is set per environment, and one added only to Production leaves preview builds
failing at `Object storage is not configured`. You have to choose:

- **Give Preview the same values.** Simplest, and it means every preview
  deployment reads and writes your live database. Treat previews as production
  for anything that writes, because that is what they are.
- **Give Preview its own Supabase project.** More setup, and the only version
  where a branch cannot damage live data. Run `pnpm secure:db --apply` against
  that project too — it is a separate database and starts open like any other.

Neither is wrong; leaving it unconsidered is, because the first one is what you
get by copying values across without thinking about it.

**Schema changes.** When a new version adds migrations, run them from your
machine against the session pooler (port 5432) *before* the deploy that needs
them:

```bash
pnpm migrate
pnpm secure:db --check   # confirms the new tables came out closed
```

A migration that adds a table adds one Supabase never saw, and whether it
arrives with row-level security on depends on a trigger that some projects will
not let us install. `--check` answers in one line and exits non-zero if
anything is open, so it also works as a build gate. If it reports open tables,
`pnpm secure:db --apply` closes them.

**Rotating the `service_role` key.** Update `SUPABASE_SERVICE_ROLE_KEY` in
Vercel and redeploy. Environment variable changes do not apply to a running
deployment.

**Database backups.** Supabase's automatic backups depend on your plan; free
projects get none you can restore yourself. If this install matters, either move
to a paid plan or schedule your own `pg_dump`.

---

## When something is wrong

| Symptom | Cause |
|---|---|
| Build fails: `Object storage is not configured. Missing: …` | Environment variables were added after the first deploy, or one is misspelled. Fix them, then redeploy — the build reads them, so it cannot succeed without. |
| `/api/health` returns `"db":"error"`, or requests hang | Using the direct connection string (IPv6-only) instead of the transaction pooler. Switch to port 6543. |
| `password authentication failed` | A special character in the password is not percent-encoded (`@` → `%40`), or the username is missing its `.PROJECT` suffix in the pooler string. |
| `too many connections` under load | `PG_POOL_MAX` was raised on a serverless host. Leave it unset — it defaults to 1 per instance, which is correct behind a pooler. |
| `max clients reached in session mode` running migrations or setup locally | The session pooler allows 15 clients; the default pool is 50. Set `PG_POOL_MAX=5` in your local `.env`. |
| `unsupported startup parameter` | The pooler rejects `statement_timeout`. Set `PG_STATEMENT_TIMEOUT=0` and redeploy. |
| Images broken everywhere | The `media` bucket is private. Make it public — it must be. |
| Upload fails with no message, or 413 | The file exceeds Vercel's 4.5MB body cap. See [What this setup cannot do](#what-this-setup-cannot-do). |
| Thumbnails never appear | Check the function logs for `[Media]` errors. Confirm `DISABLE_THUMBNAIL_GENERATION` is not set to `1`. |
| A bulk import or export times out | It exceeded the function duration limit (60s on Hobby). Add `export const maxDuration = 300` to that route file, on a plan that allows it, or split the import into smaller files. |
| Emails never arrive | `EMAIL_FROM` is an address the SMTP provider is not authorised to send as. Providers drop those silently. |
| Security Advisor: **RLS Disabled in Public**, one row per table | `pnpm secure:db --apply` has not been run, or a migration added tables after it was. Run it again — it is safe to repeat. |
| Security Advisor: **RLS Enabled No Policy**, one row per table, under *Info* | Nothing is wrong. That is what this install is supposed to look like; adding policies would undo it. |
| Preview deployments fail: `Object storage is not configured` | Environment variables were added for Production only. Vercel does not share them across environments — add each one to Preview as well, or accept that only production builds. |

Vercel's function logs are under **Deployments** → the deployment → **Logs**;
they carry the application's own log lines. Supabase's are under **Logs** in the
project dashboard.
