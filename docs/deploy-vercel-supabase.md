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
| Session pooler | `...pooler.supabase.com:5432` | Running migrations from your own machine (step 4). |
| Transaction pooler | `...pooler.supabase.com:6543` | **Vercel** (step 5). |

Vercel needs the transaction pooler because each function instance is
short-lived and opens its own connections; the pooler multiplexes them onto a
handful of real Postgres backends. Without it, moderate traffic exhausts the
connection limit and the site starts returning 500s under exactly the load you
wanted it to handle.

Copy the string the dashboard shows rather than typing one from the examples
below — the pooler's hostname and the `postgres.PROJECT` username differ per
project and per region.

Replace `[YOUR-PASSWORD]` in the string with the password from step 1. If it
contains `@`, `:`, `/` or `#`, percent-encode those characters — `@` becomes
`%40` — or the URL parses wrongly and you get an authentication error naming a
username you never typed.

## 4. Create the schema and the first account

The schema is created once, from your machine, before the first deploy. Vercel's
build step is not the place for it: preview deployments would run migrations
against production too.

```bash
git clone https://github.com/YOUR-ORG/chapteros.git
cd chapteros
pnpm install
cp .env.example .env
```

Fill in `.env` with the values from step 3, using the **session pooler** string
(port 5432) for `POSTGRESS_DATABASE_URL`. Generate the secret with
`openssl rand -base64 32`:

```bash
PAYLOAD_SECRET=<openssl rand -base64 32>
POSTGRESS_DATABASE_URL=postgresql://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
SUPABASE_STORAGE_BUCKET=media
NEXT_PUBLIC_SERVER_URL=http://localhost:3050
```

Then:

```bash
pnpm migrate:create   # generates the schema from the collections
pnpm migrate          # applies it
pnpm setup            # creates your settings + administrator account
pnpm seed:policies    # optional: Terms/Privacy/Cookie skeletons
```

`pnpm setup` asks for the organisation name and the administrator's email and
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
POSTGRESS_DATABASE_URL=postgresql://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
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

Note the **6543** — the transaction pooler, not the 5432 you used for
migrations. That is the one difference between this list and your local `.env`.

Email is not optional in practice: invitations, password resets and
notifications all go through SMTP, and an install without it cannot onboard a
single member.

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

## 7. Check it end to end

- `https://your-domain.org/api/health` → `{"status":"ok","db":"ok"}`. If `db`
  says `error`, the connection string is wrong — see the table in step 8.
- `https://your-domain.org/admin` → log in with the account from `pnpm setup`.
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
Other branches get preview deployments, which share the same environment
variables — and therefore the same production database. Treat previews as
production for anything that writes.

**Schema changes.** When a new version adds migrations, run them from your
machine against the session pooler (port 5432) *before* the deploy that needs
them:

```bash
pnpm migrate
```

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
| `unsupported startup parameter` | The pooler rejects `statement_timeout`. Set `PG_STATEMENT_TIMEOUT=0` and redeploy. |
| Images broken everywhere | The `media` bucket is private. Make it public — it must be. |
| Upload fails with no message, or 413 | The file exceeds Vercel's 4.5MB body cap. See [What this setup cannot do](#what-this-setup-cannot-do). |
| Thumbnails never appear | Check the function logs for `[Media]` errors. Confirm `DISABLE_THUMBNAIL_GENERATION` is not set to `1`. |
| A bulk import or export times out | It exceeded the function duration limit (60s on Hobby). Add `export const maxDuration = 300` to that route file, on a plan that allows it, or split the import into smaller files. |
| Emails never arrive | `EMAIL_FROM` is an address the SMTP provider is not authorised to send as. Providers drop those silently. |

Vercel's function logs are under **Deployments** → the deployment → **Logs**;
they carry the application's own log lines. Supabase's are under **Logs** in the
project dashboard.
