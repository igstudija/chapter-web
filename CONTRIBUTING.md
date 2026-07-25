# Contributing

Thanks for looking. This project was extracted from a working production system
and generalised, so some corners are better travelled than others — bug reports
from anyone installing it fresh are especially useful.

## Getting set up

See [Install](README.md#install) in the README. You need Node 20.9+, pnpm, and a
Postgres database plus an object-storage bucket (a free Supabase project gives
you both).

```bash
pnpm install
cp .env.example .env     # fill it in
pnpm migrate
pnpm setup
pnpm dev
```

## Before opening a pull request

```bash
pnpm typecheck    # must pass — the repo is currently clean
pnpm lint
pnpm test:int
```

`next.config.mjs` sets `ignoreBuildErrors` and `ignoreDuringBuilds` so that a
type error never blocks a production deploy. That is a deployment safety valve,
not permission to merge type errors — run `pnpm typecheck` yourself.

## Things worth knowing

**Changing a collection** means three steps, not one:

```bash
# 1. edit src/collections/YourCollection.ts
pnpm generate:types      # 2. update payload-types.ts
pnpm migrate:create      # 3. generate the SQL migration
```

Skipping step 3 leaves your database and everyone else's out of sync.

**Adding an admin component** also needs `pnpm generate:importmap`.

**Host-to-organisation resolution** lives in exactly one place —
`src/lib/resolveSite.ts`. Four call sites use it: page rendering, access
control, the login route, and the `beforeLogin` hook. They each used to carry
their own copy and drifted apart, which is how sessions ended up scoped to a
different organisation than the request. Please don't reintroduce a local copy.

**Storage** is likewise centralised in `src/lib/storage.ts`. If you need a new
storage operation, add it there rather than calling the provider API directly.

**Access control** is in `src/access/`. Most collections should use the
`siteScoped` / `siteBasedListFilter` helpers from `multisite.ts`. A collection
with hand-rolled access rules is a collection that will eventually leak across
organisations.

## Adding a language

1. Copy `src/messages/en.json` to `src/messages/<code>.json` and translate the
   values.
2. Add the code to `Locale` in `src/lib/i18n.ts` and register the import.
3. Add it to the `locale` options in `src/collections/Sites.ts`.

`Messages` is derived from `en.json`, so `pnpm typecheck` will list every key
your new file is missing. English is the reference translation — new keys go
there first.

## Code style

Match the surrounding code; there is no separate style guide. Prettier config is
in `.prettierrc.json`.

Comments should explain *why*, not restate *what* — particularly for anything
that looks arbitrary. A constant like `limit: 2` deserves a line saying it is
the cheapest way to distinguish "exactly one" from "more than one"; a line
reading `// set the limit to 2` does not earn its space.

## Reporting bugs

Include your Node version, whether you are on Docker or bare Node, what your
`NEXT_PUBLIC_SUPERADMIN_HOSTS` is set to, and how many organisations the install
has. That last one matters more than it sounds: the single-organisation
fallback in host resolution changes behaviour once a second organisation goes
active.

## Security

Please don't open a public issue for a security problem — email the maintainer
listed on the repository instead. This software holds personal data about real
people, so vulnerabilities in access control or tenant isolation are treated as
the highest priority.

## Licence

Contributions are accepted under the [AGPL-3.0-or-later](LICENSE), the same
licence as the project.
