# Contributing

**This project does not accept outside contributions.**

Issues are disabled. Pull requests are not reviewed and will not be merged —
including small ones, typo fixes and dependency bumps. That is a deliberate
choice about how this repository is run, not a judgement on any particular
change, and there is no queue to join or process to follow.

Saying so plainly here is the point of this file: an open repository with a
CONTRIBUTING guide usually promises a way in, and finding out otherwise after
writing a patch wastes your evening.

## What you can still do

The licence is unchanged and it is generous. Under the
[AGPL-3.0-or-later](LICENSE) you may run this, modify it, and fork it for good —
publicly, permanently, under your own name. A fork needs nobody's permission and
nothing here can withdraw it.

So if you want this software to work differently, the answer is not a pull
request against this repository. It is your own copy, which you control.

**Security problems are the one exception.** They have a private channel that
stays open — see [SECURITY.md](SECURITY.md). Please use it rather than
publishing a working exploit against every install that has not upgraded yet.

## Working on your own fork

The rest of this file is what a past maintainer would have wanted to know. None
of it obliges anyone to accept the result.

### Getting set up

See [Install](README.md#install) in the README. You need Node 20.9+, pnpm, and a
Postgres database plus an object-storage bucket (a free Supabase project gives
you both).

```bash
pnpm install
cp .env.example .env     # fill it in
pnpm migrate
pnpm bootstrap
pnpm dev
```

### Before you trust a change

```bash
pnpm typecheck    # must pass — the repo is currently clean
pnpm lint
pnpm test:int
```

`next.config.mjs` sets `ignoreBuildErrors` and `ignoreDuringBuilds` so that a
type error never blocks a production deploy. That is a deployment safety valve,
not permission to ship type errors — run `pnpm typecheck` yourself.

### Things worth knowing

**Changing a collection** means three steps, not one:

```bash
# 1. edit src/collections/YourCollection.ts
pnpm generate:types      # 2. update payload-types.ts
pnpm migrate:create      # 3. generate the SQL migration
```

Skipping step 3 leaves your database and every other install's out of sync.

**Adding an admin component** also needs `pnpm generate:importmap`.

**Settings** are read through `src/lib/getSiteSettings.ts` — `getSettings()`
and `getSlideshowSettings()`, both wrapped in React `cache` so a page rendering
many server components asks the database once rather than dozens of times. Read
them from there rather than querying the collection directly, or that dedup is
lost.

**Storage** is centralised in `src/lib/storage.ts`. A new storage operation
belongs there rather than in a direct call to the provider API.

**Access control** is in `src/access/index.ts`, as named rules —
`activeMember`, `adminOnly`, `adminOrSelf`, `activeMembersCanRead`. Use those
rather than writing a predicate inline: a collection with hand-rolled access is
the one that eventually lets a signed-out visitor read something it should not.

**Anything sized in the header, on a card or on a slide from an uploaded logo**
goes through `src/components/CompanyLogo.tsx`. Half of these files are SVGs
carrying only a `viewBox`, which have a ratio but no intrinsic size, and they
vanish the moment something gives them an automatic width.

### Adding a language

1. Copy `src/messages/en.json` to `src/messages/<code>.json` and translate the
   values.
2. Add the code to `Locale` in `src/lib/i18n.ts` and register the import.
3. Add it to the `locale` options in `src/collections/Settings.ts`.

`Messages` is derived from `en.json`, so `pnpm typecheck` will list every key
your new file is missing. English is the reference translation — new keys go
there first.

### Code style

Match the surrounding code; there is no separate style guide. Prettier config is
in `.prettierrc.json`.

Comments should explain *why*, not restate *what* — particularly for anything
that looks arbitrary. A constant like `limit: 2` deserves a line saying it is
the cheapest way to distinguish "exactly one" from "more than one"; a line
reading `// set the limit to 2` does not earn its space.
