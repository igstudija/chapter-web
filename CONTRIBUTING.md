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
pnpm bootstrap
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

Say which [tier](README.md#what-is-supported) you are on. It is the first thing
triage needs, because it decides whether you have found a defect or an
unsupported combination, and the two get very different answers.

Then: your Node version, whether you are on Docker, Vercel or bare Node, and
your `NEXT_PUBLIC_SERVER_URL`. If the problem involves uploads or images, say
which object storage you point at — a reimplemented `src/lib/storage.ts` is
tier 3, and that is a different bug from the same symptom on tier 1.

`pnpm diagnose` output is worth pasting in. It separates most infrastructure
mistakes from actual defects before either of us spends time on them.

## Security

Please don't open a public issue for a security problem — that is a working
exploit against every install that has not upgraded yet. Use GitHub's private
reporting under the *Security* tab, which reaches the maintainers and nobody
else.

[SECURITY.md](SECURITY.md) has the details: what is in scope, what to expect,
and what to do if you cannot use GitHub. Access control and session handling are
treated as the highest priority, because this software holds personal data about
real people on installs run by strangers.

## Licence

Contributions are accepted under the [AGPL-3.0-or-later](LICENSE), the same
licence as the project.
