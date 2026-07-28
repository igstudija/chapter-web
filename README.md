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

Any Postgres works if you prefer to run it yourself, but file uploads target
Supabase Storage out of the box. See [Using different infrastructure](#using-different-infrastructure).

---

## Install

```bash
git clone https://github.com/igstudija/chapter-web.git
cd chapter-web
pnpm install
cp .env.example .env
```

Fill in `.env`. The four that matter to start:

| Variable | Where to get it |
|---|---|
| `PAYLOAD_SECRET` | `openssl rand -base64 32` |
| `POSTGRESS_DATABASE_URL` | Supabase → Project Settings → Database → Connection string (URI) |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` |

In Supabase, create a **public** storage bucket named `media`. It must be public:
files are served directly from Supabase, so a private bucket makes every image
render broken rather than protected.

Then:

```bash
pnpm migrate          # create the schema — applies the migrations in src/migrations
pnpm bootstrap        # create your settings + administrator account
pnpm seed:policies    # optional: Terms/Privacy/Cookie skeletons
pnpm dev
```

- Member portal — <http://localhost:3050>
- Admin panel — <http://localhost:3050/admin>

Administration is the standard Payload admin panel. A user with the
`member-admin` role can reach it; a plain member cannot.

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

```bash
docker compose up -d --build
```

`docker-compose.yml` reads `.env`. Run the migration and setup once against your
production database:

```bash
docker compose run --rm migrate
docker compose run --rm setup
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

## Using different infrastructure

**Different Postgres.** Point `POSTGRESS_DATABASE_URL` anywhere. Nothing outside
that variable assumes Supabase for the database.

**Different object storage.** All provider-specific code is in
[`src/lib/storage.ts`](src/lib/storage.ts) — six functions over `fetch`.
Reimplement them for S3, R2, Bunny or a local disk and nothing else changes;
the Payload adapter, the thumbnail generator and the bulk uploader all go
through it.

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
