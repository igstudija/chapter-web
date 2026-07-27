import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Which corner the minimal chrome parks the next-speaker badge in.
 *
 * Guarded because dev pushes the same schema to this database.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_slideshow_settings_collection_next_speaker_position" AS ENUM('top', 'bottom');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  ALTER TABLE "slideshow_settings_collection" ADD COLUMN IF NOT EXISTS "next_speaker_position" "enum_slideshow_settings_collection_next_speaker_position" DEFAULT 'top';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "slideshow_settings_collection" DROP COLUMN IF EXISTS "next_speaker_position";
  DROP TYPE IF EXISTS "public"."enum_slideshow_settings_collection_next_speaker_position";`)
}
