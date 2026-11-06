import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `payload_mcp_api_keys` — the keys that let an MCP client (Claude and the
 * like) reach `/api/mcp`. See lib/mcp.ts.
 *
 * One boolean column per collection and operation the server can offer, all
 * defaulting to false, so a new key can do nothing until an administrator
 * ticks what it may use. Offering another collection or operation later adds
 * columns here, and so needs a migration of its own.
 *
 * The keys collection is an auth collection, so Payload also relates it from
 * its preferences and document-lock tables.
 *
 * Run `pnpm secure:db --check` afterwards on Supabase: this is a new table, and
 * whether it arrives closed depends on the event trigger `secure:db` installs.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "payload_mcp_api_keys" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "label" varchar,
    "description" varchar,
    "events_find" boolean DEFAULT false,
    "events_create" boolean DEFAULT false,
    "events_update" boolean DEFAULT false,
    "event_submissions_find" boolean DEFAULT false,
    "blog_find" boolean DEFAULT false,
    "blog_create" boolean DEFAULT false,
    "blog_update" boolean DEFAULT false,
    "success_stories_find" boolean DEFAULT false,
    "success_stories_create" boolean DEFAULT false,
    "success_stories_update" boolean DEFAULT false,
    "wiki_find" boolean DEFAULT false,
    "wiki_create" boolean DEFAULT false,
    "wiki_update" boolean DEFAULT false,
    "special_requests_find" boolean DEFAULT false,
    "special_requests_create" boolean DEFAULT false,
    "special_requests_update" boolean DEFAULT false,
    "members_find" boolean DEFAULT false,
    "members_update" boolean DEFAULT false,
    "power_groups_find" boolean DEFAULT false,
    "top40_find" boolean DEFAULT false,
    "top20_find" boolean DEFAULT false,
    "contact_submissions_find" boolean DEFAULT false,
    "media_find" boolean DEFAULT false,
    "settings_find" boolean DEFAULT false,
    "homepage_settings_find" boolean DEFAULT false,
    "homepage_settings_update" boolean DEFAULT false,
    "about_us_settings_find" boolean DEFAULT false,
    "about_us_settings_update" boolean DEFAULT false,
    "faq_settings_find" boolean DEFAULT false,
    "faq_settings_update" boolean DEFAULT false,
    "contacts_page_settings_find" boolean DEFAULT false,
    "contacts_page_settings_update" boolean DEFAULT false,
    "companies_page_settings_find" boolean DEFAULT false,
    "companies_page_settings_update" boolean DEFAULT false,
    "listing_pages_seo_find" boolean DEFAULT false,
    "listing_pages_seo_update" boolean DEFAULT false,
    "slideshow_settings_collection_find" boolean DEFAULT false,
    "slideshow_settings_collection_update" boolean DEFAULT false,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "enable_a_p_i_key" boolean,
    "api_key" varchar,
    "api_key_index" varchar
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "payload_mcp_api_keys_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN IF NOT EXISTS "payload_mcp_api_keys_id" integer;

  DO $$ BEGIN
    ALTER TABLE "payload_mcp_api_keys" ADD CONSTRAINT "payload_mcp_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payload_mcp_api_keys_fk" FOREIGN KEY ("payload_mcp_api_keys_id") REFERENCES "public"."payload_mcp_api_keys"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_payload_mcp_api_keys_fk" FOREIGN KEY ("payload_mcp_api_keys_id") REFERENCES "public"."payload_mcp_api_keys"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;

  CREATE INDEX IF NOT EXISTS "payload_mcp_api_keys_user_idx" ON "payload_mcp_api_keys" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "payload_mcp_api_keys_updated_at_idx" ON "payload_mcp_api_keys" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_mcp_api_keys_created_at_idx" ON "payload_mcp_api_keys" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_payload_mcp_api_keys_id_idx" ON "payload_locked_documents_rels" USING btree ("payload_mcp_api_keys_id");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_payload_mcp_api_keys_id_idx" ON "payload_preferences_rels" USING btree ("payload_mcp_api_keys_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT IF EXISTS "payload_preferences_rels_payload_mcp_api_keys_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_payload_mcp_api_keys_fk";
  DROP INDEX IF EXISTS "payload_preferences_rels_payload_mcp_api_keys_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_payload_mcp_api_keys_id_idx";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN IF EXISTS "payload_mcp_api_keys_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "payload_mcp_api_keys_id";
  DROP TABLE IF EXISTS "payload_mcp_api_keys" CASCADE;
  `)
}
