import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * "Slides without member info" checkbox on the Speech Master (`sm`) and
 * Power Group (`pg`) slide blocks.
 *
 * Guarded with IF NOT EXISTS: dev runs Payload's schema push against the same
 * database, so the column may already be there by the time this runs.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sm" ADD COLUMN IF NOT EXISTS "hide_member_info" boolean DEFAULT false;
  ALTER TABLE "pg" ADD COLUMN IF NOT EXISTS "hide_member_info" boolean DEFAULT false;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sm" DROP COLUMN IF EXISTS "hide_member_info";
  ALTER TABLE "pg" DROP COLUMN IF EXISTS "hide_member_info";`)
}
