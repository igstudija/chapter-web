import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Members override the chapter's slideshow choices for their own slide: where
 * their special request goes, and which corner the next-speaker badge sits in.
 *
 * Replaces the earlier `hide_special_request_on_slide` checkbox — a member who
 * had ticked it wanted "not shown", so that is what they carry over to. Written
 * by hand rather than generated: Payload's generator offered to *rename* the
 * boolean into the new enum column, which would have left `true`/`false` in a
 * field that only understands `inherit`/`bar`/`flash`/`off`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_members_slide_special_request_display" AS ENUM('inherit', 'bar', 'flash', 'off');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  DO $$ BEGIN
    CREATE TYPE "public"."enum_members_slide_next_speaker_position" AS ENUM('inherit', 'top', 'bottom');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "slide_special_request_display" "enum_members_slide_special_request_display" DEFAULT 'inherit';
  ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "slide_next_speaker_position" "enum_members_slide_next_speaker_position" DEFAULT 'inherit';

  UPDATE "members"
     SET "slide_special_request_display" = 'off'
   WHERE "hide_special_request_on_slide" IS TRUE;

  ALTER TABLE "members" DROP COLUMN IF EXISTS "hide_special_request_on_slide";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "hide_special_request_on_slide" boolean DEFAULT false;

  UPDATE "members"
     SET "hide_special_request_on_slide" = TRUE
   WHERE "slide_special_request_display" = 'off';

  ALTER TABLE "members" DROP COLUMN IF EXISTS "slide_special_request_display";
  ALTER TABLE "members" DROP COLUMN IF EXISTS "slide_next_speaker_position";
  DROP TYPE IF EXISTS "public"."enum_members_slide_special_request_display";
  DROP TYPE IF EXISTS "public"."enum_members_slide_next_speaker_position";`)
}
