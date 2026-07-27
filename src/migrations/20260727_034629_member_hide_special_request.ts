import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Per-member opt-out from showing their special request on the slide.
 *
 * Stored as "hide" with a false default so every existing member keeps the
 * behaviour they have today; only someone who deliberately turns it off loses
 * the request. Guarded because dev pushes the same schema to this database.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "hide_special_request_on_slide" boolean DEFAULT false;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "members" DROP COLUMN IF EXISTS "hide_special_request_on_slide";`)
}
