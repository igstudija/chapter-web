import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Drops the slideshow's chrome choice.
 *
 * The overlaid controls became the only ones, so there is nothing left to
 * choose between and the setting was one more knob that could only be set
 * wrong. Written by hand: the generator wanted to reconcile several unrelated
 * columns at the same time.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "slideshow_settings_collection" DROP COLUMN IF EXISTS "slide_chrome";
  DROP TYPE IF EXISTS "public"."enum_slideshow_settings_collection_slide_chrome";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_slideshow_settings_collection_slide_chrome" AS ENUM('bar', 'minimal');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  ALTER TABLE "slideshow_settings_collection" ADD COLUMN IF NOT EXISTS "slide_chrome" "enum_slideshow_settings_collection_slide_chrome" DEFAULT 'bar';`)
}
