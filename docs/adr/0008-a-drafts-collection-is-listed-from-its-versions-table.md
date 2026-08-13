# A drafts collection is listed from its versions table

Fifteen events, one post and two wiki pages sat in the database, were served by
`/api/events` and rendered on the public site, and the admin listed none of
them. Nothing was filtered, deleted or unpublished: every row was
`_status = published`.

The admin list view does not read the collection's table. For a collection with
`versions.drafts` it calls `payload.find({ draft: true })`, which Payload routes
to `db.queryDrafts`, and that reads `_<collection>_v` and nothing else. All three
version tables were empty, so the list was empty. The public site was unaffected
because a public read passes no `draft` flag and goes to the main table.

The rows had been copied in by `scripts/migrate-legacy-site.mjs`, which copies
table to table so that ids — and every foreign key between them — survive, and
which deliberately left the old `_*_v` history behind. Leaving the history
behind was right. Leaving the tables empty was not, because for these
collections the versions table is not history, it is the index the editor's list
is built from. Two other routes reach the same state: a SQL restore into the
main tables, and turning `drafts: true` on for a collection that already holds
rows, which creates the `_v` table beside them.

## Decision

A document in a drafts-enabled collection always has at least one version row.
`lib/documentVersions.ts` finds the ones that do not and repairs them by
re-saving through the Local API — the version tables mirror the whole field
structure, blocks and relationship rows in their own side tables, and Payload is
the only thing that can build that shape for an arbitrary collection. A
hand-written INSERT would work for a flat collection and silently lose the
blocks of a `wiki` page.

The repair runs by itself when a dev server starts, from `onInit`. It is not in
`preflight`, which is documented as making no network calls, and this needs the
database.

## Consequences

The re-save moves `updatedAt`. Nothing here sorts on it, and the alternative —
writing the old timestamp back underneath Payload — buys a cosmetic detail with
a hand-rolled UPDATE over live rows.

The start-up repair is development-only. A production boot is the wrong moment
to begin writing rows; on Vercel that is once per cold start, several at a time.
A restore made straight into production is repaired with `pnpm backfill:versions
--apply`, which is also what that script exists for. It reports without writing
by default and exits non-zero while anything is still missing, so it can be run
as a check. `PAYLOAD_SKIP_VERSION_BACKFILL=1` is how it stops `onInit` from
pre-empting its own dry run.

`migrate-legacy-site.mjs --apply` now ends by running that script, so a
migration finishes in a state an editor can see. If that step fails the
migration still succeeds and says, in as many words, which command is
outstanding.

Anything else that writes these tables without going through Payload inherits
the same obligation. The check is generic — it asks the config which collections
have drafts — so a collection that gains `drafts: true` later is covered without
being named anywhere.
