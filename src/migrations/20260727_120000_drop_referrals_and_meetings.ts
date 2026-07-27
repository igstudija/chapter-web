import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Removes the activities module: referrals passed between members, one-to-one
 * meetings and their comment threads, and the per-member referral counters the
 * two fed.
 *
 * Both tables were empty when this was written, so nothing is lost in practice
 * — but `down()` can only restore the shape, never the rows. It recreates the
 * tables, indexes and foreign keys exactly as Payload had generated them, so a
 * rollback lands on a schema the old collections would still accept.
 *
 * `settings.enable_activities` goes with them: it existed only to switch this
 * module off, and there is no longer a module to switch.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DROP TABLE IF EXISTS "one_to_one_meetings_comments" CASCADE;
  DROP TABLE IF EXISTS "one_to_one_meetings" CASCADE;
  DROP TABLE IF EXISTS "referrals" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_referrals_status";

  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "one_to_one_meetings_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "referrals_id";

  ALTER TABLE "members" DROP COLUMN IF EXISTS "referrals_given_count";
  ALTER TABLE "members" DROP COLUMN IF EXISTS "referrals_received_count";

  ALTER TABLE "settings" DROP COLUMN IF EXISTS "enable_activities";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_referrals_status" AS ENUM('pending', 'success', 'failed');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  CREATE TABLE IF NOT EXISTS "referrals" (
    "id" serial PRIMARY KEY NOT NULL,
    "from_user_id" integer NOT NULL,
    "to_user_id" integer NOT NULL,
    "date" timestamp(3) with time zone NOT NULL,
    "description" varchar NOT NULL,
    "status" "enum_referrals_status" DEFAULT 'pending' NOT NULL,
    "value" numeric,
    "created_by_id" integer NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "one_to_one_meetings" (
    "id" serial PRIMARY KEY NOT NULL,
    "met_with_id" integer NOT NULL,
    "invited_by_id" integer NOT NULL,
    "location" varchar NOT NULL,
    "topics" varchar NOT NULL,
    "date" timestamp(3) with time zone NOT NULL,
    "created_by_id" integer NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "one_to_one_meetings_comments" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar NOT NULL,
    "author_id" integer NOT NULL,
    "comment_created_at" timestamp(3) with time zone
  );

  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_from_user_id_users_id_fk"
    FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_to_user_id_users_id_fk"
    FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_created_by_id_users_id_fk"
    FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

  ALTER TABLE "one_to_one_meetings" ADD CONSTRAINT "one_to_one_meetings_met_with_id_users_id_fk"
    FOREIGN KEY ("met_with_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "one_to_one_meetings" ADD CONSTRAINT "one_to_one_meetings_invited_by_id_users_id_fk"
    FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "one_to_one_meetings" ADD CONSTRAINT "one_to_one_meetings_created_by_id_users_id_fk"
    FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

  ALTER TABLE "one_to_one_meetings_comments" ADD CONSTRAINT "one_to_one_meetings_comments_author_id_users_id_fk"
    FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "one_to_one_meetings_comments" ADD CONSTRAINT "one_to_one_meetings_comments_parent_id_fk"
    FOREIGN KEY ("_parent_id") REFERENCES "public"."one_to_one_meetings"("id") ON DELETE cascade ON UPDATE no action;

  CREATE INDEX IF NOT EXISTS "referrals_from_user_idx" ON "referrals" USING btree ("from_user_id");
  CREATE INDEX IF NOT EXISTS "referrals_to_user_idx" ON "referrals" USING btree ("to_user_id");
  CREATE INDEX IF NOT EXISTS "referrals_created_by_idx" ON "referrals" USING btree ("created_by_id");
  CREATE INDEX IF NOT EXISTS "referrals_updated_at_idx" ON "referrals" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "referrals_created_at_idx" ON "referrals" USING btree ("created_at");

  CREATE INDEX IF NOT EXISTS "one_to_one_meetings_met_with_idx" ON "one_to_one_meetings" USING btree ("met_with_id");
  CREATE INDEX IF NOT EXISTS "one_to_one_meetings_invited_by_idx" ON "one_to_one_meetings" USING btree ("invited_by_id");
  CREATE INDEX IF NOT EXISTS "one_to_one_meetings_created_by_idx" ON "one_to_one_meetings" USING btree ("created_by_id");
  CREATE INDEX IF NOT EXISTS "one_to_one_meetings_updated_at_idx" ON "one_to_one_meetings" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "one_to_one_meetings_created_at_idx" ON "one_to_one_meetings" USING btree ("created_at");

  CREATE INDEX IF NOT EXISTS "one_to_one_meetings_comments_order_idx" ON "one_to_one_meetings_comments" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "one_to_one_meetings_comments_parent_id_idx" ON "one_to_one_meetings_comments" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "one_to_one_meetings_comments_author_idx" ON "one_to_one_meetings_comments" USING btree ("author_id");

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "one_to_one_meetings_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "referrals_id" integer;

  ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "referrals_given_count" numeric DEFAULT 0;
  ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "referrals_received_count" numeric DEFAULT 0;

  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "enable_activities" boolean DEFAULT true;`)
}
