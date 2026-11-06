# How-to guides

Short, task-shaped guides for people running an install. The
[README](../../README.md) covers installing and the
[Vercel + Supabase guide](../deploy-vercel-supabase.md) covers deploying; these
pick up from there.

## Running the site

| Guide | When you need it |
| --- | --- |
| [Leave members out of this week's slides](skip-members-from-the-slideshow.md) | Before every meeting with someone absent |
| [Connect Claude to your site with MCP](connect-claude-with-mcp.md) | You want an assistant to draft events, posts or the slide skip list for you |
| [Search, sharing and launch checklist](launch-checklist-search-and-sharing.md) | Once at launch, and after changing the domain |

## Upgrading and the database

| Guide | When you need it |
| --- | --- |
| [Upgrade to the November 2026 release](upgrade-to-the-november-2026-release.md) | Moving an existing install to Next.js 16 / Payload 3.93 |
| [Run migrations in production](run-migrations-in-production.md) | Any release that adds files to `src/migrations` |
| [Recover from a dev push](recover-from-a-dev-push.md) | `pnpm migrate` stops to ask whether to reset the database, or hangs |
| [Set cache headers on existing media](set-media-cache-headers.md) | Once, on an install with uploads from before November 2026 |

## Changing the code

| Guide | When you need it |
| --- | --- |
| [Add a third-party script under the CSP](add-a-third-party-script.md) | A chat widget, booking embed or tracking snippet that will not load |
