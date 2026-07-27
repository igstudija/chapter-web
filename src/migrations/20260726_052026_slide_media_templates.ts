import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Member slides gain a media type (photo sequence vs embedded video), a video
 * URL, a layout template and a many-to-media `slideImages` relation.
 *
 * Guarded with IF NOT EXISTS: the dev environment runs Payload's schema push
 * against the same database, so these objects may already be in place.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_members_slide_media_type" AS ENUM('image', 'video');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  DO $$ BEGIN
    CREATE TYPE "public"."enum_members_slide_template" AS ENUM('classic', 'spotlight', 'cover');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  CREATE TABLE IF NOT EXISTS "members_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );

  ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "slide_media_type" "enum_members_slide_media_type" DEFAULT 'image';
  ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "slide_video_url" varchar;
  ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "slide_template" "enum_members_slide_template" DEFAULT 'classic';

  DO $$ BEGIN
    ALTER TABLE "members_rels" ADD CONSTRAINT "members_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  DO $$ BEGIN
    ALTER TABLE "members_rels" ADD CONSTRAINT "members_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  CREATE INDEX IF NOT EXISTS "members_rels_order_idx" ON "members_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "members_rels_parent_idx" ON "members_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "members_rels_path_idx" ON "members_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "members_rels_media_id_idx" ON "members_rels" USING btree ("media_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "members_rels" CASCADE;
  ALTER TABLE "members" DROP COLUMN IF EXISTS "slide_media_type";
  ALTER TABLE "members" DROP COLUMN IF EXISTS "slide_video_url";
  ALTER TABLE "members" DROP COLUMN IF EXISTS "slide_template";
  DROP TYPE IF EXISTS "public"."enum_members_slide_media_type";
  DROP TYPE IF EXISTS "public"."enum_members_slide_template";`)
}
