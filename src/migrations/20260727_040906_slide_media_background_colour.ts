import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Second slide colour, for the media side of the Classic template. Null means
 * "same as the main colour", so existing members are unaffected.
 *
 * Guarded because dev pushes the same schema to this database.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "slide_background_color_right" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "members" DROP COLUMN IF EXISTS "slide_background_color_right";`)
}
