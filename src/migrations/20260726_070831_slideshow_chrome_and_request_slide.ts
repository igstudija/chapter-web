import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Slideshow gains a photo-sequence length, a chrome style and a choice of where
 * the special request goes; members gain the `reels` template.
 *
 * Guarded: dev runs Payload's schema push against the same database, so these
 * objects may already exist by the time the migration runs.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_slideshow_settings_collection_slide_chrome" AS ENUM('bar', 'minimal');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  DO $$ BEGIN
    CREATE TYPE "public"."enum_slideshow_settings_collection_special_request_display" AS ENUM('bar', 'slide');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  ALTER TYPE "public"."enum_members_slide_template" ADD VALUE IF NOT EXISTS 'reels';

  ALTER TABLE "slideshow_settings_collection" ADD COLUMN IF NOT EXISTS "slide_image_seconds" numeric DEFAULT 30;
  ALTER TABLE "slideshow_settings_collection" ADD COLUMN IF NOT EXISTS "slide_chrome" "enum_slideshow_settings_collection_slide_chrome" DEFAULT 'bar';
  ALTER TABLE "slideshow_settings_collection" ADD COLUMN IF NOT EXISTS "special_request_display" "enum_slideshow_settings_collection_special_request_display" DEFAULT 'bar';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Postgres cannot drop a single enum value, so the type is rebuilt without
  // `reels`. Members still on it fall back to the default first.
  await db.execute(sql`
   UPDATE "members" SET "slide_template" = 'classic' WHERE "slide_template" = 'reels';
  ALTER TABLE "members" ALTER COLUMN "slide_template" SET DATA TYPE text;
  ALTER TABLE "members" ALTER COLUMN "slide_template" SET DEFAULT 'classic'::text;
  DROP TYPE IF EXISTS "public"."enum_members_slide_template";
  CREATE TYPE "public"."enum_members_slide_template" AS ENUM('classic', 'spotlight', 'cover');
  ALTER TABLE "members" ALTER COLUMN "slide_template" SET DEFAULT 'classic'::"public"."enum_members_slide_template";
  ALTER TABLE "members" ALTER COLUMN "slide_template" SET DATA TYPE "public"."enum_members_slide_template" USING "slide_template"::"public"."enum_members_slide_template";
  ALTER TABLE "slideshow_settings_collection" DROP COLUMN IF EXISTS "slide_image_seconds";
  ALTER TABLE "slideshow_settings_collection" DROP COLUMN IF EXISTS "slide_chrome";
  ALTER TABLE "slideshow_settings_collection" DROP COLUMN IF EXISTS "special_request_display";
  DROP TYPE IF EXISTS "public"."enum_slideshow_settings_collection_slide_chrome";
  DROP TYPE IF EXISTS "public"."enum_slideshow_settings_collection_special_request_display";`)
}
