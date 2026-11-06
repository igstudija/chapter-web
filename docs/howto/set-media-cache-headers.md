# Set cache headers on existing media

Uploads are served straight from Supabase Storage. Supabase keeps a
`Cache-Control` header with each object, set when the file is uploaded, and
until November 2026 nothing set one — so browsers and CDNs asked again for every
image on every visit. New uploads now get `max-age=604800` (a week). Files
uploaded before that keep `no-cache` until they are rewritten.

```bash
pnpm media:cache-headers           # list what would change
pnpm media:cache-headers --apply   # rewrite them
```

Run it with `.env` holding the production `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_STORAGE_BUCKET`.

Supabase has no way to change an object's metadata alone, so `--apply`
downloads each file from its public URL and uploads the same bytes back to the
same key with the header. URLs, content and the database are unchanged. It
takes a few minutes for a few hundred files, and running it again only touches
what still lacks the header.

**Why a week and not a year:** if a file is ever overwritten under the same
name, visitors keep the old copy for as long as the header allows. A week is
long enough to save nearly every repeat request and short enough not to matter
when that happens.

The number is `OBJECT_MAX_AGE_SECONDS` in
[`src/lib/storage.ts`](../../src/lib/storage.ts).
