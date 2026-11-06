# ChapterOS

A website and member portal for professional networking chapters — groups that
meet every week, pass each other business, and want a site of their own rather
than a seat in someone else's platform.

One install is one chapter: its public website, its members' portal and the
slides for its meetings, all managed from one admin panel. Built on
[Payload CMS 3](https://payloadcms.com) and [Next.js 16](https://nextjs.org).

> **Status: early.** Taken from a site that has run for several chapters, then
> generalised for anyone to install. The features are mature; the packaging for
> outside installs is new, so expect rough edges.
>
> **Development is closed.** The source is published under the AGPL and you are
> free to run, fork and modify it — but this repository does not take outside
> contributions: issues are turned off and pull requests are not reviewed. See
> [CONTRIBUTING.md](CONTRIBUTING.md), and [SECURITY.md](SECURITY.md) for the one
> channel that stays open: private vulnerability reports.

---

## Start here

| I want to… | Go to |
| --- | --- |
| Create a website for my chapter | [Create a new site](#create-a-new-site) |
| Put it on the internet | [Deploying to Vercel + Supabase](docs/deploy-vercel-supabase.md) |
| Leave absent members out of this week's slides | [Skip members from the slideshow](docs/howto/skip-members-from-the-slideshow.md) |
| Let Claude draft events, posts and pages for me | [Connect Claude with MCP](docs/howto/connect-claude-with-mcp.md) |
| Be found on Google and look right when shared | [Search and sharing checklist](docs/howto/launch-checklist-search-and-sharing.md) |
| Update a site that is already running | [Update an existing site](#update-an-existing-site) |
| Fix something that stopped working | [When something is wrong](docs/deploy-vercel-supabase.md#when-something-is-wrong) |
| See every guide | [docs/howto](docs/howto/README.md) |

---

## What you get

- **A public website** — home page, about, events, member companies, blog,
  success stories, FAQ and contacts, in Latvian or English.
- **A guest link** — `/viesis` on a Latvian site, `/guest` otherwise. It always
  opens the registration form of the next public meeting, so you can put it on
  buttons, in social media bios and on printed QR codes once and never update
  it.
- **A members' portal** — profiles, the member directory, and each member's
  **Top 40 / Top 20**: the companies and contacts they want to be introduced
  to. Members search each other's lists to find where they can help; optional
  AI tagging lets the search work by industry rather than exact names.
- **Special requests** — short "I'm looking for…" posts, and optionally
  [shared with another chapter](docs/special-request-exchange.md).
- **Meeting slides** — a presentation built from member profiles: photo,
  business figures, what each member is looking for, power groups, Speech
  Master. Leave absent members out with one field.
- **Events** — event pages with registration, guest sign-ups and calendar
  invites.
- **An admin panel** for all of it — no code needed to run the site day to day.
- **An assistant, if you want one** — connect Claude to the site and ask it to
  draft next week's event, update the FAQ or take absent members off the
  slides. You decide, key by key, what it may touch; it can never delete
  anything or see logins.

---

## Create a new site

Allow about an hour the first time, most of it waiting for accounts to be
created. You do not need to be a developer, but you will copy a few commands
into a terminal.

### What you need first

- **A computer with [Node.js](https://nodejs.org) 20.9 or newer** and
  **[pnpm](https://pnpm.io/installation)** 9 or 10.
- **A [Supabase](https://supabase.com) account** (free) — it holds the database
  and the uploaded photos.
- **An email sending service** — anything that speaks SMTP. The examples use
  [Mailjet](https://www.mailjet.com), whose free tier is enough for a chapter.
  Without one the site still runs, but it cannot invite members or reset
  passwords.
- **To put it online:** a [Vercel](https://vercel.com) account (free) and a
  GitHub account. Not needed to try it on your own computer.

### Step 1 — Create the database and file storage

1. In [Supabase](https://supabase.com/dashboard), click **New project**. Pick
   the region closest to your members, and save the **database password** — it
   is shown once.
2. Open **Storage → New bucket**, name it `media`, and switch **Public bucket**
   on. (It has to be public: photos are served straight from it.)

### Step 2 — Get the code

```bash
git clone https://github.com/igstudija/chapter-web.git
cd chapter-web
pnpm install
```

### Step 3 — Run the setup wizard

```bash
pnpm wizard
```

It asks one thing at a time and checks each answer before moving on:

1. **This install** — the address the site will have.
2. **Database** — the connection string from Supabase's **Connect** button
   (use the *Session pooler* one).
3. **File storage** — the Supabase project URL and `service_role` key
   (**Project Settings → API**), and the bucket name.
4. **Email** — your SMTP details and the address mail is sent from.

Then it writes the settings file, builds the database, locks it against public
access, and creates your **chapter name and administrator account**.

> **Run the wizard yourself, not through an AI coding assistant.** The answers
> are passwords and keys, and an assistant's conversation log is the last place
> they belong. The wizard never prints a secret back.

### Step 4 — Try it on your computer

```bash
pnpm dev
```

- The website — <http://localhost:3050>
- The admin panel — <http://localhost:3050/admin> — sign in with the
  administrator account from step 3.

### Step 5 — Put it online

Follow **[Deploying to Vercel + Supabase](docs/deploy-vercel-supabase.md)** —
about 30 minutes, with a check at the end that everything works. Docker and
other hosts are covered [below](#hosting-options).

### Step 6 — Make it yours

In the admin panel:

- [ ] **Settings → Branding** — chapter name and logo.
- [ ] **Settings → Organisation** — language and timezone.
- [ ] **Settings → SEO** — a share image (1200 × 630, a group photo works best)
      and a one-line description.
- [ ] **Settings → Social Media** — your profile links.
- [ ] **Homepage** — the headline and the *meeting note*: when, where and how
      often you meet.
- [ ] **Members → Create New** — add each member; tick **Create New User** to
      give them a login. They sign in with a link sent by email.
- [ ] **Events** — publish the next meeting, so the guest link has somewhere to
      go.
- [ ] **Policy Templates** — fill in the `[bracketed]` parts of the Terms,
      Privacy and Cookie pages, and have them checked (see [Legal](#legal)).

Then work through the
**[search and sharing checklist](docs/howto/launch-checklist-search-and-sharing.md)**.

<details>
<summary><strong>The same setup by hand, step by step</strong></summary>

```bash
cp .env.example .env
```

Fill in `.env`. The five that matter to start:

| Variable                    | Where to get it                                                  |
| --------------------------- | ---------------------------------------------------------------- |
| `PAYLOAD_SECRET`            | `openssl rand -base64 32`                                        |
| `POSTGRESS_DATABASE_URL`    | Supabase → **Connect** → Session pooler connection string        |
| `SUPABASE_URL`              | Supabase → Project Settings → API → Project URL                  |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role`               |
| `SUPABASE_STORAGE_BUCKET`   | the bucket from step 1 — `media` unless you renamed it           |

Then:

```bash
pnpm diagnose          # check those values before relying on them
pnpm migrate           # create the database tables
pnpm secure:db --apply # close the tables to Supabase's public API
pnpm bootstrap         # your chapter name + administrator account (five questions)
pnpm seed:policies     # fill the three policy pages the footer links to
pnpm dev
```

**Keep this order, and never start `pnpm dev` before `pnpm migrate`.** In
development the app writes the database tables itself and records that as a
migration named `dev`; from then on `pnpm migrate` stops to ask whether to reset
the database, and with nothing at the keyboard it waits forever.
[Recover from a dev push](docs/howto/recover-from-a-dev-push.md) repairs it, but
it is cheaper not to get there.

`pnpm diagnose` comes first on purpose: it connects to the database, checks the
bucket exists and is public, and opens a connection to your mail server, so a
mistyped password is one sentence now rather than a puzzle three steps later.

`pnpm seed:policies` is not decoration. The footer links to Terms, Privacy and
Cookie policy on every page, and without templates those pages are empty — a
blank privacy policy reads as a claim that nothing is collected.

To run `pnpm bootstrap` without a terminal, set `SETUP_ORG_NAME`,
`SETUP_ADMIN_EMAIL` and `SETUP_ADMIN_PASSWORD`.

</details>

<details>
<summary><strong>Why the database has to be locked (<code>pnpm secure:db</code>)</strong></summary>

Supabase publishes every table over HTTP to the role behind its *anon* key — a
value that ships in browsers — and new tables start with row-level security
off. Until `pnpm secure:db --apply` runs, a fresh install's member data is
readable by anyone who knows the project's address. It turns row-level security
on everywhere, removes the grants, and installs a trigger so tables added later
start closed. On plain Postgres there is nothing to close and it says so. The
wizard runs it for you.

While you are in Supabase, also switch the Data API off — *Integrations → Data
API → Enable Data API*. Nothing here uses it; uploads go through Storage, which
keeps working. The Security Advisor's *Info* tab will keep listing every table
as "RLS Enabled No Policy" — that is the intended state. See
[ADR 0006](docs/adr/0006-the-database-is-closed-to-supabases-api-roles.md).

</details>

---

## Day to day

| Job | How |
| --- | --- |
| Someone is away this week | [Leave them out of the slides](docs/howto/skip-members-from-the-slideshow.md) — Settings → Slideshow → *Skip Members*, pick by name. Empty it after the meeting. |
| Invite guests | Share `https://your-domain/viesis` (or `/guest`). It always opens the next meeting's registration. |
| Get help from Claude | [Connect Claude with MCP](docs/howto/connect-claude-with-mcp.md) — create a key under MCP → API Keys, tick what it may do. |
| Add a member | Members → Create New, tick **Create New User**. They sign in with an email link. |
| Show another chapter's requests | [Special request exchange](docs/special-request-exchange.md) — needs an agreement between the chapters first. |

Only users with the **Member + Admin** role can open the admin panel.

---

## Update an existing site

1. Get the new version (`git pull`, or merge it into your copy) and run
   `pnpm install`.
2. Run `pnpm migrate` against the live database **before** putting the new
   version online — updates only add to the database, so the running site keeps
   working, while the new version cannot work without them.
   [Run migrations in production](docs/howto/run-migrations-in-production.md)
   explains how, including from Vercel.
3. Deploy.

**Coming from a Next.js 15 version?** Read
[Upgrade to the November 2026 release](docs/howto/upgrade-to-the-november-2026-release.md)
first — it closes security holes that need a command run on your data, not only
a deploy.

---

## Hosting options

### Vercel + Supabase — recommended

No server to maintain: Supabase holds the database and files, Vercel runs the
site. **→ [docs/deploy-vercel-supabase.md](docs/deploy-vercel-supabase.md)**

One limit is Vercel's rather than ours: it rejects uploads over 4.5 MB, so
photos straight off a camera must be resized first. The guide covers that and
the other sharp edges.

### Docker

`docker-compose.yml` reads `.env`. Prepare the database first, in the same order
as everywhere else:

```bash
docker compose run --rm migrate
docker compose run --rm secure-db
docker compose run --rm setup
```

Then start it:

```bash
docker compose up -d --build
```

These are one-off containers rather than `exec` into the running app: the
runtime image is a standalone Next.js bundle without the Payload CLI or the
TypeScript sources, so these tasks run from the `builder` stage. Set
`SETUP_ORG_NAME`, `SETUP_ADMIN_EMAIL` and `SETUP_ADMIN_PASSWORD` to run setup
without a terminal. On a normal server uploads may be up to 15 MB for images
and 50 MB for audio.

### Anywhere that runs Node

`pnpm build && pnpm start`. The build produces a standalone Next.js output.

On a **serverless** host other than Vercel, Netlify or Lambda — which are
detected automatically — set `SERVERLESS=1`. It switches three behaviours: one
database connection per instance instead of fifty, logging to the console
instead of a file the platform discards, and no memory watchdog restarting a
process that has no supervisor to restart it.

**Not required:** Cloudflare or any other CDN. The rate limiter reads
`cf-connecting-ip` if the site happens to be behind Cloudflare, the same way it
reads Vercel's and nginx's headers.

---

## What is supported

Not every combination gets the same promise. Three tiers, so you know before
you start which part is guaranteed and which part is yours. They describe how
far the code is written and tested to hold — not a support queue: there is no
issue tracker here ([CONTRIBUTING.md](CONTRIBUTING.md)).

### Tier 1 — Supabase and Vercel

**Guaranteed, and proven on every commit.** CI stands up an empty Postgres,
applies the migrations, runs `pnpm bootstrap` and loads the resulting site in a
browser. This is the path the code is written against and the one these
instructions describe. A defect on this path is a defect in the code, not a
misconfiguration on your side.

### Tier 2 — any Postgres, on Docker or bare Node

**Documented, best-effort.** Point `POSTGRESS_DATABASE_URL` anywhere; nothing
outside that variable assumes Supabase for the database, and CI exercises the
schema against stock Postgres. The whole combination is not covered.

### Tier 3 — any other object storage

**A seam, and no promise.** Provider-specific code lives in
[`src/lib/storage.ts`](src/lib/storage.ts): nine exports, all but two speaking
to the provider. Reimplement them for S3, R2, Bunny or a local disk and nothing
else changes. Nothing tests this; if you take it on, you are the one who knows
whether it works.

---

## Adapting it

**Rebranding.** [`src/lib/branding.ts`](src/lib/branding.ts) holds every product
name and default. Colours are theme tokens in
[`src/app/(frontend)/styles.css`](<src/app/(frontend)/styles.css>) — `brand`,
`ink`, `surface`, `accent` — each reading a CSS custom property so they can be
overridden at runtime.

**Another language.** Add `src/messages/<code>.json` alongside `en.json`, add the
code to `Locale` in [`src/lib/i18n.ts`](src/lib/i18n.ts), and register it.
`Messages` is derived from `en.json`, so TypeScript lists every key you are
missing. The active language is chosen under Settings.

**A third-party script** (chat widget, booking embed, tracking): the public
pages run a strict Content-Security-Policy, so see
[Add a third-party script](docs/howto/add-a-third-party-script.md).

---

## Legal

**The policy templates are skeletons, not legal documents.** `pnpm seed:policies`
creates Terms, Privacy and Cookie drafts with the usual sections and every
substantive claim left as a `[bracketed]` prompt — a prewritten policy naming
another country's authority would look authoritative while being wrong. Fill
them in and have a lawyer in your jurisdiction review them before publishing.

This software stores personal data about members — names, contact details,
photos, business figures. Wherever you operate, that comes with obligations
around lawful basis, retention, access and deletion. Those are yours to meet.

---

## For developers

```bash
pnpm dev                # dev server on :3050
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint
pnpm test:int           # vitest
pnpm test:e2e           # playwright
pnpm generate:types     # regenerate payload-types.ts after schema changes
pnpm migrate:create     # create a migration after changing collections
pnpm migrate:reconcile  # repair migration records after a dev push
```

Collections live in `src/collections/` and are registered in
`src/payload.config.ts`. After changing a collection, run `generate:types` and
`migrate:create`. Access control is centralised in `src/access/`; `role` and
`status` live on the user record and travel in the session token, so an access
check is a field comparison rather than a database lookup.

[CONTRIBUTING.md](CONTRIBUTING.md) has the rest of what a maintainer of a fork
should know.

---

## Licence

[AGPL-3.0-or-later](LICENSE).

You can run, modify and self-host this freely, and fork it if you want to take
it somewhere else. If you run a modified version as a network service, the AGPL
requires you to offer your users the modified source.

Development being closed does not narrow any of that: the licence grants what it
grants, and none of it depends on this repository accepting your changes back.
If the AGPL does not suit your situation, reach the maintainer through the
[igstudija](https://github.com/igstudija) profile — not through issues, which
are disabled.
