# ChapterOS

A self-hostable member portal for professional networking organisations — the
kind that meet regularly, pass business referrals to each other, and want their
own site rather than a seat in someone else's platform.

Built on [Payload CMS 3](https://payloadcms.com) and Next.js 15. One install can
serve a single organisation or many, each on its own domain with its own
members, content and branding.

> **Status: early.** Extracted from a production system that has been running
> for several organisations, then generalised. The feature set is mature; the
> packaging for outside installs is new, and rough edges are likely. Issues
> welcome.

---

## What it does

**Members**
Member directory with profiles, companies, photos and contact details. Profiles
are member-editable; visibility is controlled per organisation.

**Referrals and one-to-ones**
Members log referrals passed to each other and one-to-one meetings held, with
business value attached. Both feed per-member and per-group statistics.

**Top 40 / Top 20**
Each member maintains a list of companies and contacts they want to be
introduced to. Other members search across all lists to find where they can
help. Optional AI tagging classifies entries by industry so the search works on
meaning rather than exact company names.

**Special requests**
Short-lived "I'm looking for X" posts. Includes a token-gated, brand-free page
that combines requests across several organisations — shareable outside the
platform without exposing member data or requiring a login.

**Events**
Event pages with registration, guest submissions and calendar invites.

**Presentations**
A slideshow mode that renders member and power-group slides for meetings —
photos, business figures, what each member is looking for.

**Content**
Blog, wiki, FAQ, success stories, static pages, and a policy-template system
with per-organisation placeholder substitution.

**AI assistant** (optional, off by default)
A chat widget that answers questions about members and their business using
function-calling against your own data. Requires an OpenAI key, configured from
the superadmin panel.

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
git clone https://github.com/YOUR-ORG/chapteros.git
cd chapteros
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
pnpm migrate          # create the schema (~70 tables)
pnpm setup            # create your organisation + superadmin account
pnpm seed:policies    # optional: Terms/Privacy/Cookie skeletons
pnpm dev
```

- Organisation site — <http://localhost:3050>
- Admin panel — <http://localhost:3050/admin>
- Superadmin console — <http://admin.localhost:3050/admin>

`*.localhost` resolves to `127.0.0.1` in every current browser, so the
superadmin host needs no `/etc/hosts` entry.

---

## How hosts map to organisations

Each organisation has a `domain`. An incoming request resolves like this:

1. Host is in `NEXT_PUBLIC_SUPERADMIN_HOSTS` → superadmin console, no
   organisation context.
2. Host matches an active organisation's `domain` → that organisation.
3. Otherwise, if the install has exactly **one** active organisation → that one.

Rule 3 is why a single-organisation install works without configuration: it
covers `localhost`, a bare IP, a platform preview URL, and a custom domain you
have not typed into the record yet. It stops applying the moment a second
organisation is activated, so it can never serve the wrong tenant.

To add a second organisation, create it in the superadmin console with its own
domain and point DNS at the same install.

---

## Deploy

### Docker

```bash
docker compose up -d --build
```

`docker-compose.yml` reads `.env`. Run the migration and setup once against your
production database:

```bash
docker compose exec app pnpm migrate
docker compose exec app pnpm setup
```

Set `SETUP_ORG_NAME`, `SETUP_ORG_DOMAIN`, `SETUP_ADMIN_EMAIL` and
`SETUP_ADMIN_PASSWORD` to run setup without a terminal.

### Anywhere that runs Node

`pnpm build && pnpm start`. The build produces a standalone Next.js output.

One caveat on **serverless** platforms: thumbnail generation is fire-and-forget
after upload, and serverless runtimes kill work once the response is sent. Set
`DISABLE_THUMBNAIL_GENERATION=1` there and generate thumbnails another way, or
deploy to a long-running host.

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
overridden per organisation at runtime.

**Another language.** Add `src/messages/<code>.json` alongside `en.json`, add the
code to `Locale` in [`src/lib/i18n.ts`](src/lib/i18n.ts), and register it.
`Messages` is derived from `en.json`, so TypeScript will list every key you are
missing. Each organisation picks its language in its own settings.

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
`siteScoped` helpers from `src/access/multisite.ts` rather than hand-rolled
rules. Host-to-organisation resolution has exactly one implementation, in
`src/lib/resolveSite.ts`; four call sites share it precisely because earlier
copies drifted apart.

---

## Licence

[AGPL-3.0-or-later](LICENSE).

You can run, modify and self-host this freely. If you run a modified version as
a network service, the AGPL requires you to offer your users the modified
source. If that does not suit your situation, open an issue — other arrangements
are possible.

## A note on origins

This began as a portal for BNI chapters in Latvia and was generalised into a
product. It carries no BNI branding, no BNI-specific data model and no
affiliation with or endorsement by BNI Global LLC. "BNI" is their trademark, not
one used here.
