import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Links to other chapters, and the flag that decides what reaches them.
 *
 * `is_public` becomes `chapter_only`, inverted. The old field was never read by
 * any query, but it was not empty: this install had 109 of 219 requests set to
 * `false`, across 35 members. Most look like an older system's default, and
 * thirteen are members who unticked a box that said "Show this request publicly
 * to other members". Nothing in the row tells the two apart, so all of them are
 * carried across as "keep this in my chapter" — being wrong that way costs
 * reach, and being wrong the other way costs consent (ADR 0007).
 *
 * Written by hand so that the backfill happens between adding the new column
 * and dropping the old one. A generated migration would have replaced one with
 * the other and taken the answers with it.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "special_requests" ADD COLUMN IF NOT EXISTS "chapter_only" boolean DEFAULT false;

  UPDATE "special_requests" SET "chapter_only" = NOT COALESCE("is_public", true);

  ALTER TABLE "special_requests" DROP COLUMN IF EXISTS "is_public";

  CREATE TABLE IF NOT EXISTS "chapter_connections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"our_secret" varchar NOT NULL,
  	"their_key" varchar,
  	"paused" boolean DEFAULT false,
  	"last_reached_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "chapter_connections_id" integer;`)

  // Added separately: the constraint and index fail if the column above was
  // already present from a dev push, and this is the repairable half.
  await db.execute(sql`
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_chapter_connections_fk"
      FOREIGN KEY ("chapter_connections_id") REFERENCES "public"."chapter_connections"("id")
      ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_chapter_connections_id_idx"
    ON "payload_locked_documents_rels" USING btree ("chapter_connections_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "special_requests" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT true;

  UPDATE "special_requests" SET "is_public" = NOT COALESCE("chapter_only", false);

  ALTER TABLE "special_requests" DROP COLUMN IF EXISTS "chapter_only";

  DROP INDEX IF EXISTS "payload_locked_documents_rels_chapter_connections_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "chapter_connections_id";
  DROP TABLE IF EXISTS "chapter_connections";`)
}
