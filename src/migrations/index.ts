/**
 * No migrations yet.
 *
 * The previous initial migration described the multi-tenant schema — a `sites`
 * table and a `site_id` column on roughly seventy others. None of that exists
 * any more, and rewriting it by hand would be guesswork, so the schema is
 * regenerated from the collections instead:
 *
 *   pnpm migrate:create    # against an empty database
 *   pnpm migrate
 *
 * This is a fresh-install path on purpose. Data from a multi-tenant install
 * cannot be carried across it.
 */
export const migrations = []
