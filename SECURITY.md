# Security policy

This software holds personal data about real people — names, contact details,
photos, business figures — on installs run by organisations that are not us. A
flaw here is somebody's members' data, so please report it privately and give us
a chance to ship a fix before it is public.

## Reporting a vulnerability

Use GitHub's private reporting: **[Report a
vulnerability](https://github.com/igstudija/chapter-web/security/advisories/new)**,
or the *Security* tab → *Report a vulnerability*. The report is visible only to
the maintainers until an advisory is published.

Please do not open a public issue for a security problem. A public issue is a
working exploit against every install that has not upgraded yet.

If you cannot use GitHub, open a normal issue saying only that you have a
security report and how to reach you privately — no details.

## What to expect

- **An acknowledgement within a week.** If you have not heard back in that time,
  assume the notification was lost and prod the maintainer publicly, without
  detail.
- **An assessment within two weeks**, saying whether we agree it is a
  vulnerability and what we plan to do.
- **Credit in the advisory** unless you would rather not be named.

This is a small project, not a company with an on-call rota. Those are honest
intentions rather than a contractual response time.

## What is in scope

Anything that lets someone reach data or actions they should not have:

- Access-control holes — a Member seeing or editing what only an administrator
  should, or a signed-out visitor reaching either.
- Authentication and session handling, including password reset and invitation
  flows.
- Injection of any kind, and anything that escapes the intended query.
- Exposure of the `service_role` key, the signing secret, or any other value
  documented as server-side only.
- A database still reachable with the Supabase anon key after the documented
  install path was followed — `pnpm secure:db` failing to close something, or a
  table appearing later that it does not catch.
- Uploads that let a file end up somewhere it should not, or be served as
  something it is not.

## What is not

- **Findings against a tier 3 install.** A reimplemented storage seam is your
  code; see [What is supported](README.md#what-is-supported).
- **Missing hardening on somebody's own deployment** — an unpatched host, a
  database open to the internet, a bucket made public that should not have been.
  Note that the media bucket *is* meant to be public; that is documented, not a
  finding. An install that skipped `pnpm secure:db` is this rather than the
  entry above it.
- **Tables reported as “RLS Enabled No Policy”** by Supabase's Security Advisor.
  That is the intended state — see
  [ADR 0006](docs/adr/0006-the-database-is-closed-to-supabases-api-roles.md).
- **The policy templates.** `pnpm seed:policies` produces skeletons with
  `[bracketed]` prompts, deliberately. An unfilled template is not a
  vulnerability.
- Reports from automated scanners with no demonstrated impact.
