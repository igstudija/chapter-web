# ChapterOS

A self-hostable member portal for professional networking organisations — the
kind that meet regularly, do business with each other, and want their own site
rather than a seat in someone else's platform.

Built on [Payload CMS 3](https://payloadcms.com) and Next.js 15. One install
serves one organisation: its members, its content, its branding, administered
from the standard Payload admin panel.

> **Status: early.** Extracted from a production system that has been running
> for several organisations, then generalised and reduced to a single-organisation
> install. The feature set is mature; the
> packaging for outside installs is new, and rough edges are likely. Issues
> welcome.

---

## What it does

**Members**
Member directory with profiles, companies, photos and contact details. Profiles
are member-editable; visibility is controlled under Settings.

**Top 40 / Top 20**
Each member maintains a list of companies and contacts they want to be
introduced to. Other members search across all lists to find where they can
help. Optional AI tagging classifies entries by industry so the search works on
meaning rather than exact company names.

**Special requests**
Short-lived "I'm looking for X" posts, visible to the membership.

**Events**
Event pages with registration, guest submissions and calendar invites.

**Presentations**
A slideshow mode that renders member and power-group slides for meetings —
photos, business figures, what each member is looking for.

**Content**
Blog, wiki, FAQ, success stories, static pages, and a policy-template system
with placeholder substitution.

---

## Requirements

- **Node.js** 20.9+ (or 18.20.2+)
- **pnpm** 9 or 10
- **A Supabase project** — provides both Postgres and object storage
- **An SMTP provider** — sends invitations and password resets

Any Postgres works if you prefer to run it yourself, but file uploads target
Supabase Storage out of the box, and that is the combination the project
guarantees. See [What is supported](#what-is-supported) before choosing
otherwise.

Any provider speaking SMTP works. This project is developed against
[Mailjet](https://www.mailjet.com), which has a free tier large enough for a
chapter, and `.env.example` carries its settings as the worked example. The site
starts and runs without one — it warns on every start and then cannot invite a
member or reset a password, which is most of what a member portal does.

**Not required:** a Cloudflare account, or any other CDN. The rate limiter reads
`cf-connecting-ip` if it happens to be behind Cloudflare, the same way it reads
Vercel's and nginx's headers, and falls back to the socket address when there is
nothing in front of the app at all.

---

## Install

```bash
git clone https://github.com/igstudija/chapter-web.git
cd chapter-web
pnpm install
cp .env.example .env
```

Fill in `.env`. The five that matter to start:

| Variable | Where to get it |
|---|---|
| `PAYLOAD_SECRET` | `openssl rand -base64 32` |
| `POSTGRESS_DATABASE_URL` | Supabase → Project Settings → Database → Connection string (URI) |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` |
| `SUPABASE_STORAGE_BUCKET` | the bucket you make below — `media` unless you rename it |

In Supabase, create a **public** storage bucket named `media`. It must be public:
files are served directly from Supabase, so a private bucket makes every image
render broken rather than protected.

Then:

```bash
pnpm diagnose          # check those values before relying on them
pnpm migrate           # create the schema — applies the migrations in src/migrations
pnpm secure:db --apply # close the tables to Supabase's public API roles
pnpm bootstrap         # your settings + administrator account (it asks three questions)
pnpm seed:policies     # fill the three policy pages the footer links to
pnpm dev
```

> **Run these in this order, and do not start `pnpm dev` before `pnpm migrate`.**
> In development Payload writes the schema itself rather than applying the
> migrations, and records it as a migration named `dev`. From then on
> `pnpm migrate` believes the schema has drifted and stops to ask whether to
> reset the database — with nothing at the keyboard, it waits forever and prints
> nothing at all. `pnpm diagnose` reports a database in that state, but the
> cheaper move is not to get there.

`pnpm diagnose` is first on purpose. It connects to the database, checks the
bucket exists and is public, and opens a connection to your mail server, so a
mistyped password or a private bucket is a sentence now rather than a puzzle
three steps later. Everything it reports names what to change. Before
`pnpm migrate` it reports the missing schema as expected rather than as a
failure, so the first command in the list does not exit with an error.

`pnpm seed:policies` is listed last but is not decoration. The footer links to
Terms, Privacy and Cookie policy on every page, and without templates those
pages render a heading over nothing — a blank privacy policy reads as a claim
that nothing is collected, which is worse than no page at all. The skeletons it
writes still have to be edited before launch; they say so in brackets.

`pnpm secure:db` is the one step you cannot skip on Supabase. Supabase publishes
every table in `public` over HTTP to the role behind the anon key — a value that
ships in browsers — and Postgres creates tables with row-level security off, so
a fresh install's member data is world-readable until this runs. It turns RLS on
everywhere, revokes the grants, and installs an event trigger so tables added
later stay closed. On plain Postgres there is nothing to close and it says so.

While you are in Supabase, turn the Data API off as well — *Integrations → Data
API → Enable Data API*. Nothing here calls `/rest/v1/`; uploads go to
`/storage/v1/`, which is a different service and keeps working. Expect the
Security Advisor's *Info* tab to keep listing every table as “RLS Enabled No
Policy” afterwards. That is the intended state, not a leftover.
See [ADR 0006](docs/adr/0006-the-database-is-closed-to-supabases-api-roles.md).

- Member portal — <http://localhost:3050>
- Admin panel — <http://localhost:3050/admin>

Administration is the standard Payload admin panel. A user with the
`member-admin` role can reach it; a plain member cannot.

### Sharing special requests with another chapter

Two installs can show each other's special requests. An admin on each side
creates a connection, hands the other a key, and members see both chapters'
requests in one list with a filter in the header.

It sends the requester's contact details to the other chapter's server, so it
needs an agreement between the two organisations before it needs any
configuration.

**→ [docs/special-request-exchange.md](docs/special-request-exchange.md)**

---

## Deploy

### Vercel + Supabase

No server to maintain: Supabase provides the database and the file storage,
Vercel runs the app. About 30 minutes end to end.

**→ [docs/deploy-vercel-supabase.md](docs/deploy-vercel-supabase.md)**

The app adapts itself when it detects a serverless host — a small database pool
per instance, console-only logging, thumbnails held open with `after()` instead
of detached. One limitation is the platform's rather than ours: Vercel rejects
request bodies over 4.5MB, so uploads are capped well below the 15MB/50MB a
normal server allows. The guide covers that and the rest of the sharp edges.

### Docker

`docker-compose.yml` reads `.env`. Prepare the database first, in the same order
as every other path — the app has nothing to serve until the schema exists, and
the window between creating tables and closing them is not one to spend with the
site already up:

```bash
docker compose run --rm migrate
docker compose run --rm secure-db
docker compose run --rm setup
```

Then start it:

```bash
docker compose up -d --build
```

These are one-off containers, not `exec` into the running app: the runtime image
is a standalone Next.js bundle carrying neither the Payload CLI nor the
TypeScript sources, so both tasks run from the `builder` stage instead.

Set `SETUP_ORG_NAME`, `SETUP_ADMIN_EMAIL` and `SETUP_ADMIN_PASSWORD` to run
setup without a terminal.

### Anywhere that runs Node

`pnpm build && pnpm start`. The build produces a standalone Next.js output.

On a **serverless** host other than Vercel, Netlify or Lambda — which are
detected automatically — set `SERVERLESS=1`. It switches the same three
behaviours: one database connection per instance instead of fifty, logging to
the console instead of a file that the platform discards, and no memory
watchdog restarting a process that has no supervisor to restart it.

---

## What is supported

Not every combination gets the same promise, and pretending otherwise helps
nobody. Three tiers, so you know before you start which part of this is
guaranteed and which part is yours.

### Tier 1 — Supabase and Vercel

**Guaranteed, and proven on every commit.** CI stands up an empty Postgres,
applies the migrations, runs `pnpm bootstrap` and loads the resulting site in a
browser. This is the path the code is written against and the one the install
docs describe. Bug reports are bugs.

### Tier 2 — any Postgres, on Docker or bare Node

**Documented, best-effort.** Point `POSTGRESS_DATABASE_URL` anywhere; nothing
outside that variable assumes Supabase for the database, and CI exercises the
schema against stock Postgres rather than Supabase specifically. What is not
covered is the whole combination — a report here is welcome and may take a
while, because reproducing it means building your setup rather than opening a
terminal.

### Tier 3 — any other object storage

**A seam, and no promise.** Provider-specific code lives in
[`src/lib/storage.ts`](src/lib/storage.ts): nine exports, of which all but two
speak to the provider. Reimplement them for S3, R2, Bunny or a local disk and
nothing else changes — the Payload adapter, the thumbnail generator and the bulk
uploader all go through that module.

Nothing tests this, here or anywhere. If you take it on you are the one who
knows whether it works, and a patch is more useful to both of us than a bug
report.

---

## Adapting it

**Rebranding.** [`src/lib/branding.ts`](src/lib/branding.ts) holds every product
name and default. Colours are theme tokens in
[`src/app/(frontend)/styles.css`](src/app/(frontend)/styles.css) — `brand`,
`ink`, `surface`, `accent` — each reading a CSS custom property so they can be
overridden at runtime.

**Another language.** Add `src/messages/<code>.json` alongside `en.json`, add the
code to `Locale` in [`src/lib/i18n.ts`](src/lib/i18n.ts), and register it.
`Messages` is derived from `en.json`, so TypeScript will list every key you are
missing. The active language is set under Settings.

---

## Legal

**The policy templates are skeletons, not legal documents.** `pnpm seed:policies`
creates Terms, Privacy and Cookie drafts with the usual sections and every
substantive claim left as a `[bracketed]` prompt. This is deliberate: a
prewritten policy naming another country's supervisory authority would look
authoritative while being wrong. Fill them in and have a lawyer in your
jurisdiction review them before publishing.

This software stores personal data about members — names, contact details,
photos, business figures. Wherever you operate, that comes with obligations
around lawful basis, retention, access and deletion. Those are yours to meet.

---

## Development

```bash
pnpm dev              # dev server on :3050
pnpm typecheck        # tsc --noEmit
pnpm test:int         # vitest
pnpm test:e2e         # playwright
pnpm generate:types   # regenerate payload-types.ts after schema changes
pnpm migrate:create   # create a migration after changing collections
```

Collections live in `src/collections/` and are registered in
`src/payload.config.ts`. After changing a collection, run `generate:types` and
`migrate:create`.

Access control is centralised in `src/access/` — most collections use the
helpers from `src/access/index.ts` rather than hand-rolled rules. `role` and
`status` live on the User record and travel in the JWT, so an access check is a
field comparison rather than a database lookup.

---

## Licence

[AGPL-3.0-or-later](LICENSE).

You can run, modify and self-host this freely. If you run a modified version as
a network service, the AGPL requires you to offer your users the modified
source. If that does not suit your situation, open an issue — other arrangements
are possible.
