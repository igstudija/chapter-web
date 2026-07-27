import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Two more ways to show a member's request: flashed over the middle of their
 * slide for the last seconds, or not at all.
 *
 * Guarded: dev runs Payload's schema push against the same database, so the
 * values may already be present by the time this runs.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_slideshow_settings_collection_special_request_display" ADD VALUE IF NOT EXISTS 'flash';
  ALTER TYPE "public"."enum_slideshow_settings_collection_special_request_display" ADD VALUE IF NOT EXISTS 'off';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Postgres cannot drop single enum values, so the type is rebuilt. Anything
  // on a removed value falls back to the bar first.
  await db.execute(sql`
   UPDATE "slideshow_settings_collection" SET "special_request_display" = 'bar' WHERE "special_request_display" IN ('flash', 'off');
  ALTER TABLE "slideshow_settings_collection" ALTER COLUMN "special_request_display" SET DATA TYPE text;
  ALTER TABLE "slideshow_settings_collection" ALTER COLUMN "special_request_display" SET DEFAULT 'bar'::text;
  DROP TYPE IF EXISTS "public"."enum_slideshow_settings_collection_special_request_display";
  CREATE TYPE "public"."enum_slideshow_settings_collection_special_request_display" AS ENUM('bar', 'slide');
  ALTER TABLE "slideshow_settings_collection" ALTER COLUMN "special_request_display" SET DEFAULT 'bar'::"public"."enum_slideshow_settings_collection_special_request_display";
  ALTER TABLE "slideshow_settings_collection" ALTER COLUMN "special_request_display" SET DATA TYPE "public"."enum_slideshow_settings_collection_special_request_display" USING "special_request_display"::"public"."enum_slideshow_settings_collection_special_request_display";`)
}
