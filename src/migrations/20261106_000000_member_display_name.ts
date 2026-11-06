import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `members.display_name` — "Name Surname (Company)", the member collection's
 * title, so the admin's member pickers (the slideshow's skip list, Speech
 * Master, contact persons, team grid) list people rather than companies.
 *
 * The hook in Members.ts writes it on every save; this fills it for the rows
 * that exist, the same way: the member's own name, else the user account's,
 * then the company in brackets. Whitespace is collapsed with a POSIX class
 * because a backslash would not survive the template literal.
 *
 * Additive and nullable, so it can run before or after the deploy.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "display_name" varchar;
  CREATE INDEX IF NOT EXISTS "members_display_name_idx" ON "members" USING btree ("display_name");

  UPDATE "members" AS m
  SET "display_name" = NULLIF(
    CASE
      WHEN p.person <> '' AND p.firm <> '' THEN p.person || ' (' || p.firm || ')'
      WHEN p.person <> '' THEN p.person
      ELSE p.firm
    END,
    ''
  )
  FROM (
    SELECT
      m2."id",
      btrim(regexp_replace(
        concat_ws(' ',
          COALESCE(NULLIF(btrim(m2."name"), ''), u."name"),
          COALESCE(NULLIF(btrim(m2."surname"), ''), u."surname")),
        '[[:space:]]+', ' ', 'g')) AS person,
      btrim(regexp_replace(COALESCE(m2."company", ''), '[[:space:]]+', ' ', 'g')) AS firm
    FROM "members" AS m2
    LEFT JOIN "users" AS u ON u."id" = m2."user_id"
  ) AS p
  WHERE p."id" = m."id";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "members_display_name_idx";
  ALTER TABLE "members" DROP COLUMN IF EXISTS "display_name";
  `)
}
