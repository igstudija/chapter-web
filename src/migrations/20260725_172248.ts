import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('member', 'member-admin');
  CREATE TYPE "public"."enum_users_status" AS ENUM('active', 'blocked');
  CREATE TYPE "public"."enum_members_role" AS ENUM('member', 'member-admin');
  CREATE TYPE "public"."enum_members_status" AS ENUM('active', 'blocked');
  CREATE TYPE "public"."enum_members_slide_image_mode" AS ENUM('contain', 'cover');
  CREATE TYPE "public"."enum_members_attendance_type" AS ENUM('onsite', 'online');
  CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_blog_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__blog_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_special_requests_status" AS ENUM('open', 'in-progress', 'fulfilled', 'closed');
  CREATE TYPE "public"."enum_referrals_status" AS ENUM('pending', 'success', 'failed');
  CREATE TYPE "public"."enum_contact_submissions_status" AS ENUM('new', 'in-progress', 'resolved');
  CREATE TYPE "public"."enum_event_submissions_status" AS ENUM('pending', 'confirmed', 'cancelled');
  CREATE TYPE "public"."enum_wiki_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__wiki_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_audit_logs_action" AS ENUM('user_deleted', 'user_created', 'user_updated', 'admin_login', 'admin_login_failed', 'member_created', 'member_deleted');
  CREATE TYPE "public"."enum_audit_logs_target_type" AS ENUM('user', 'member');
  CREATE TYPE "public"."enum_policy_templates_type" AS ENUM('terms', 'privacy', 'cookies');
  CREATE TYPE "public"."enum_policy_templates_locale" AS ENUM('lv', 'en');
  CREATE TYPE "public"."enum_faq_settings_faqs_category" AS ENUM('general', 'membership', 'meetings', 'referrals', 'events', 'other');
  CREATE TYPE "public"."enum_settings_locale" AS ENUM('en', 'lv');
  CREATE TYPE "public"."enum_settings_seo_twitter_card" AS ENUM('summary', 'summary_large_image');
  CREATE TYPE "public"."enum_settings_schema_organization_type" AS ENUM('Organization', 'LocalBusiness', 'ProfessionalService', 'Corporation');
  CREATE TYPE "public"."enum_img_display_mode" AS ENUM('contain', 'cover');
  CREATE TABLE "power_groups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"surname" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'member' NOT NULL,
  	"status" "enum_users_status" DEFAULT 'active' NOT NULL,
  	"custom_reset_token" varchar,
  	"custom_reset_expiry" timestamp(3) with time zone,
  	"magic_link_token" varchar,
  	"magic_link_expiry" timestamp(3) with time zone,
  	"pending_email" varchar,
  	"email_change_token" varchar,
  	"email_change_expiry" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "members_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"caption" varchar
  );
  
  CREATE TABLE "members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"create_new_user" boolean DEFAULT false,
  	"new_user_email" varchar,
  	"new_user_name" varchar,
  	"new_user_surname" varchar,
  	"user_id" integer,
  	"role" "enum_members_role" DEFAULT 'member' NOT NULL,
  	"status" "enum_members_status" DEFAULT 'active' NOT NULL,
  	"name" varchar,
  	"surname" varchar,
  	"phone" varchar,
  	"profile_image_id" integer,
  	"description" varchar,
  	"logo_id" integer,
  	"slide_image_id" integer,
  	"slide_background_color" varchar DEFAULT '#ffffff',
  	"slide_image_mode" "enum_members_slide_image_mode" DEFAULT 'contain',
  	"company" varchar,
  	"company_phone" varchar,
  	"company_email" varchar,
  	"website" varchar,
  	"country" varchar,
  	"company_description" varchar,
  	"inauguration_date" timestamp(3) with time zone,
  	"power_group_id" integer,
  	"job_position" varchar,
  	"org_role" varchar,
  	"power_group_lead" boolean DEFAULT false,
  	"attendance_type" "enum_members_attendance_type" DEFAULT 'onsite',
  	"tyfcb_received" numeric DEFAULT 0,
  	"tyfcb_given" numeric DEFAULT 0,
  	"revenue_received" numeric DEFAULT 0,
  	"referrals_received_count" numeric DEFAULT 0,
  	"referrals_given_count" numeric DEFAULT 0,
  	"ai_credit_balance_usd" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"prefix" varchar DEFAULT 'media',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone,
  	"location" varchar,
  	"description" jsonb,
  	"image_id" integer,
  	"is_public" boolean DEFAULT true,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"seo_keywords" varchar,
  	"seo_og_title" varchar,
  	"seo_og_description" varchar,
  	"seo_og_image_id" integer,
  	"seo_canonical_url" varchar,
  	"seo_no_index" boolean DEFAULT false,
  	"seo_no_follow" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_events_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_date" timestamp(3) with time zone,
  	"version_end_date" timestamp(3) with time zone,
  	"version_location" varchar,
  	"version_description" jsonb,
  	"version_image_id" integer,
  	"version_is_public" boolean DEFAULT true,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"version_seo_keywords" varchar,
  	"version_seo_og_title" varchar,
  	"version_seo_og_description" varchar,
  	"version_seo_og_image_id" integer,
  	"version_seo_canonical_url" varchar,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version_seo_no_follow" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "blog" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"excerpt" varchar,
  	"content" jsonb,
  	"featured_image_id" integer,
  	"author_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"seo_keywords" varchar,
  	"seo_og_title" varchar,
  	"seo_og_description" varchar,
  	"seo_og_image_id" integer,
  	"seo_canonical_url" varchar,
  	"seo_no_index" boolean DEFAULT false,
  	"seo_no_follow" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_blog_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_blog_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_excerpt" varchar,
  	"version_content" jsonb,
  	"version_featured_image_id" integer,
  	"version_author_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"version_seo_keywords" varchar,
  	"version_seo_og_title" varchar,
  	"version_seo_og_description" varchar,
  	"version_seo_og_image_id" integer,
  	"version_seo_canonical_url" varchar,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version_seo_no_follow" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__blog_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "special_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"request" varchar NOT NULL,
  	"registration_number" varchar,
  	"is_public" boolean DEFAULT true,
  	"requested_by_id" integer NOT NULL,
  	"status" "enum_special_requests_status" DEFAULT 'open',
  	"sort_order" numeric DEFAULT 0,
  	"show_on_slide" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "top40" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"company_name" varchar NOT NULL,
  	"contact_person" varchar NOT NULL,
  	"position" varchar,
  	"registration_number" varchar,
  	"notes" varchar,
  	"business_tags" varchar,
  	"submitted_by_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "top20" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"company_name" varchar NOT NULL,
  	"contact_person" varchar,
  	"position" varchar,
  	"registration_number" varchar,
  	"notes" varchar,
  	"business_tags" varchar,
  	"submitted_by_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "success_stories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"story" varchar NOT NULL,
  	"business_value" varchar,
  	"partner_member_id" integer,
  	"is_public" boolean DEFAULT true,
  	"author_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "one_to_one_meetings_comments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"author_id" integer NOT NULL,
  	"comment_created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "one_to_one_meetings" (
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
  
  CREATE TABLE "referrals" (
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
  
  CREATE TABLE "contact_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"subject" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"status" "enum_contact_submissions_status" DEFAULT 'new',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "event_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer,
  	"event_title" varchar,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"company" varchar,
  	"invited_by" varchar,
  	"message" varchar,
  	"status" "enum_event_submissions_status" DEFAULT 'pending',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "wiki_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"subheading" varchar,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "wiki_blocks_content_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "wiki_blocks_team_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "wiki_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "wiki_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "wiki_blocks_contact_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"email" varchar,
  	"phone" varchar,
  	"address" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "wiki" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"content" jsonb,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"seo_keywords" varchar,
  	"seo_og_title" varchar,
  	"seo_og_description" varchar,
  	"seo_og_image_id" integer,
  	"seo_canonical_url" varchar,
  	"seo_no_index" boolean DEFAULT false,
  	"seo_no_follow" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_wiki_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "wiki_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"members_id" integer
  );
  
  CREATE TABLE "_wiki_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"subheading" varchar,
  	"image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_wiki_v_blocks_content_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_wiki_v_blocks_team_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_wiki_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_wiki_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_wiki_v_blocks_contact_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"email" varchar,
  	"phone" varchar,
  	"address" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_wiki_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_content" jsonb,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"version_seo_keywords" varchar,
  	"version_seo_og_title" varchar,
  	"version_seo_og_description" varchar,
  	"version_seo_og_image_id" integer,
  	"version_seo_canonical_url" varchar,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version_seo_no_follow" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__wiki_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_wiki_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"members_id" integer
  );
  
  CREATE TABLE "audit_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"action" "enum_audit_logs_action" NOT NULL,
  	"performed_by_id" integer,
  	"performed_by_email" varchar,
  	"target_type" "enum_audit_logs_target_type",
  	"target_id" varchar,
  	"target_email" varchar,
  	"details" jsonb,
  	"ip_address" varchar,
  	"user_agent" varchar,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "policy_templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_policy_templates_type" NOT NULL,
  	"locale" "enum_policy_templates_locale" NOT NULL,
  	"title" varchar NOT NULL,
  	"content" varchar NOT NULL,
  	"last_updated" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "homepage_settings_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" varchar,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "homepage_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"internal_title" varchar,
  	"hero_title" varchar DEFAULT 'Welcome' NOT NULL,
  	"hero_highlighted_text" varchar DEFAULT '',
  	"hero_description" varchar DEFAULT 'Business Network International - connecting professionals through trusted referrals and building lasting business relationships.',
  	"hero_primary_button_text" varchar DEFAULT 'View Members',
  	"hero_primary_button_link" varchar DEFAULT '/companies',
  	"hero_secondary_button_text" varchar DEFAULT 'Contact Us',
  	"hero_secondary_button_link" varchar DEFAULT '/contacts',
  	"hero_background_image_id" integer,
  	"hero_enable_overlay" boolean DEFAULT true,
  	"stats_title" varchar DEFAULT 'BY THE NUMBERS',
  	"cta_title" varchar DEFAULT 'Ready to Grow Your Business?',
  	"cta_description" varchar DEFAULT 'Join our network of professionals and start receiving quality referrals today.',
  	"cta_button_text" varchar DEFAULT 'Get in Touch',
  	"cta_button_link" varchar DEFAULT '/contacts',
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"seo_keywords" varchar,
  	"seo_og_title" varchar,
  	"seo_og_description" varchar,
  	"seo_og_image_id" integer,
  	"seo_canonical_url" varchar,
  	"seo_no_index" boolean DEFAULT false,
  	"seo_no_follow" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contacts_page_settings_contact_persons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL
  );
  
  CREATE TABLE "contacts_page_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT 'Kontakti' NOT NULL,
  	"form_settings_form_title" varchar DEFAULT 'RAKSTI MUMS' NOT NULL,
  	"form_settings_form_description" varchar DEFAULT 'We will answer your questions.',
  	"form_settings_submit_button_text" varchar DEFAULT 'Sūtīt' NOT NULL,
  	"form_settings_success_message" varchar DEFAULT 'Paldies! Mēs sazināsimies ar Jums tuvākajā laikā.' NOT NULL,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"seo_keywords" varchar,
  	"seo_og_title" varchar,
  	"seo_og_description" varchar,
  	"seo_og_image_id" integer,
  	"seo_canonical_url" varchar,
  	"seo_no_index" boolean DEFAULT false,
  	"seo_no_follow" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "about_us_settings_chapter_leaders" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"position" varchar NOT NULL
  );
  
  CREATE TABLE "about_us_settings_how_we_work_meetings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"frequency" varchar NOT NULL,
  	"time" varchar NOT NULL,
  	"location" varchar,
  	"is_virtual" boolean
  );
  
  CREATE TABLE "about_us_settings_principles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL
  );
  
  CREATE TABLE "about_us_settings_membership_info_benefits" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"benefit" varchar NOT NULL
  );
  
  CREATE TABLE "about_us_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT 'About Us' NOT NULL,
  	"introduction" varchar NOT NULL,
  	"how_we_work_title" varchar DEFAULT 'How We Work',
  	"how_we_work_description" varchar,
  	"membership_info_title" varchar DEFAULT 'Join Our Chapter',
  	"membership_info_description" varchar,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"seo_keywords" varchar,
  	"seo_og_title" varchar,
  	"seo_og_description" varchar,
  	"seo_og_image_id" integer,
  	"seo_canonical_url" varchar,
  	"seo_no_index" boolean DEFAULT false,
  	"seo_no_follow" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "faq_settings_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" jsonb NOT NULL,
  	"category" "enum_faq_settings_faqs_category" DEFAULT 'general',
  	"order" numeric DEFAULT 0
  );
  
  CREATE TABLE "faq_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"page_title" varchar DEFAULT 'Frequently Asked Questions' NOT NULL,
  	"page_description" varchar DEFAULT 'Find answers to common questions about membership and our organisation.',
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"seo_keywords" varchar,
  	"seo_og_title" varchar,
  	"seo_og_description" varchar,
  	"seo_og_image_id" integer,
  	"seo_canonical_url" varchar,
  	"seo_no_index" boolean DEFAULT false,
  	"seo_no_follow" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "settings_admin_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL
  );
  
  CREATE TABLE "settings_schema_same_as" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"internal_title" varchar,
  	"locale" "enum_settings_locale" DEFAULT 'lv' NOT NULL,
  	"timezone" varchar DEFAULT 'Europe/Riga',
  	"enable_activities" boolean DEFAULT true,
  	"enable_attendance" boolean DEFAULT false,
  	"enable_success_stories" boolean DEFAULT true,
  	"site_name" varchar DEFAULT 'Your Organisation' NOT NULL,
  	"site_logo_id" integer,
  	"favicon16_id" integer,
  	"favicon32_id" integer,
  	"apple_touch_icon_id" integer,
  	"favicon192_id" integer,
  	"favicon512_id" integer,
  	"email_from" varchar DEFAULT '' NOT NULL,
  	"email_from_name" varchar DEFAULT 'Your Organisation' NOT NULL,
  	"social_media_facebook" varchar,
  	"social_media_instagram" varchar,
  	"social_media_twitter" varchar,
  	"social_media_linkedin" varchar,
  	"social_media_tiktok" varchar,
  	"google_analytics_id" varchar,
  	"google_tag_manager_id" varchar,
  	"facebook_pixel_id" varchar,
  	"seo_default_title" varchar,
  	"seo_title_suffix" varchar,
  	"seo_default_description" varchar,
  	"seo_default_keywords" varchar,
  	"seo_og_site_name" varchar,
  	"seo_default_og_image_id" integer,
  	"seo_twitter_card" "enum_settings_seo_twitter_card" DEFAULT 'summary_large_image',
  	"seo_twitter_site" varchar,
  	"seo_google_verification" varchar,
  	"seo_bing_verification" varchar,
  	"seo_robots_txt" varchar,
  	"schema_organization_type" "enum_settings_schema_organization_type" DEFAULT 'Organization',
  	"schema_organization_name" varchar,
  	"schema_organization_logo_id" integer,
  	"schema_founding_date" timestamp(3) with time zone,
  	"schema_address_street_address" varchar,
  	"schema_address_city" varchar,
  	"schema_address_postal_code" varchar,
  	"schema_address_country" varchar DEFAULT 'Latvia',
  	"schema_contact_phone" varchar,
  	"schema_contact_email" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "lw" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"custom_slide_seconds" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "sm" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"custom_slide_seconds" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "sm_cer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"member_id" integer NOT NULL,
  	"custom_slide_seconds" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "pg" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"power_group_id" integer NOT NULL,
  	"disable_timer" boolean DEFAULT false,
  	"custom_slide_seconds" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "gu" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"guests_text" varchar NOT NULL,
  	"custom_slide_seconds" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "img" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"display_mode" "enum_img_display_mode" DEFAULT 'contain',
  	"background_color" varchar DEFAULT '#000000',
  	"custom_slide_seconds" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "slideshow_settings_collection" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"internal_title" varchar,
  	"slide_seconds" numeric DEFAULT 60 NOT NULL,
  	"speech_master_multiplier" numeric DEFAULT 2,
  	"business_given_min" numeric DEFAULT 0,
  	"business_received_min" numeric DEFAULT 0,
  	"transition_sound_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "slideshow_settings_collection_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"members_id" integer
  );
  
  CREATE TABLE "listing_pages_seo" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"blog_page_page_title" varchar,
  	"blog_page_page_description" varchar,
  	"blog_page_seo_meta_title" varchar,
  	"blog_page_seo_meta_description" varchar,
  	"blog_page_seo_keywords" varchar,
  	"blog_page_seo_og_title" varchar,
  	"blog_page_seo_og_description" varchar,
  	"blog_page_seo_og_image_id" integer,
  	"blog_page_seo_canonical_url" varchar,
  	"blog_page_seo_no_index" boolean DEFAULT false,
  	"blog_page_seo_no_follow" boolean DEFAULT false,
  	"events_page_page_title" varchar,
  	"events_page_page_description" varchar,
  	"events_page_seo_meta_title" varchar,
  	"events_page_seo_meta_description" varchar,
  	"events_page_seo_keywords" varchar,
  	"events_page_seo_og_title" varchar,
  	"events_page_seo_og_description" varchar,
  	"events_page_seo_og_image_id" integer,
  	"events_page_seo_canonical_url" varchar,
  	"events_page_seo_no_index" boolean DEFAULT false,
  	"events_page_seo_no_follow" boolean DEFAULT false,
  	"companies_page_page_title" varchar,
  	"companies_page_page_description" varchar,
  	"companies_page_seo_meta_title" varchar,
  	"companies_page_seo_meta_description" varchar,
  	"companies_page_seo_keywords" varchar,
  	"companies_page_seo_og_title" varchar,
  	"companies_page_seo_og_description" varchar,
  	"companies_page_seo_og_image_id" integer,
  	"companies_page_seo_canonical_url" varchar,
  	"companies_page_seo_no_index" boolean DEFAULT false,
  	"companies_page_seo_no_follow" boolean DEFAULT false,
  	"success_stories_page_page_title" varchar,
  	"success_stories_page_page_description" varchar,
  	"success_stories_page_seo_meta_title" varchar,
  	"success_stories_page_seo_meta_description" varchar,
  	"success_stories_page_seo_keywords" varchar,
  	"success_stories_page_seo_og_title" varchar,
  	"success_stories_page_seo_og_description" varchar,
  	"success_stories_page_seo_og_image_id" integer,
  	"success_stories_page_seo_canonical_url" varchar,
  	"success_stories_page_seo_no_index" boolean DEFAULT false,
  	"success_stories_page_seo_no_follow" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "companies_page_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT 'Uzņēmumi' NOT NULL,
  	"subtitle" varchar DEFAULT 'Apmeklē mūs',
  	"description" varchar,
  	"cta_label" varchar DEFAULT 'APMEKLĒ MŪS',
  	"cta_link" varchar DEFAULT '/contacts',
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"seo_keywords" varchar,
  	"seo_og_title" varchar,
  	"seo_og_description" varchar,
  	"seo_og_image_id" integer,
  	"seo_canonical_url" varchar,
  	"seo_no_index" boolean DEFAULT false,
  	"seo_no_follow" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"power_groups_id" integer,
  	"users_id" integer,
  	"members_id" integer,
  	"media_id" integer,
  	"events_id" integer,
  	"blog_id" integer,
  	"special_requests_id" integer,
  	"top40_id" integer,
  	"top20_id" integer,
  	"success_stories_id" integer,
  	"one_to_one_meetings_id" integer,
  	"referrals_id" integer,
  	"contact_submissions_id" integer,
  	"event_submissions_id" integer,
  	"wiki_id" integer,
  	"audit_logs_id" integer,
  	"policy_templates_id" integer,
  	"homepage_settings_id" integer,
  	"contacts_page_settings_id" integer,
  	"about_us_settings_id" integer,
  	"faq_settings_id" integer,
  	"settings_id" integer,
  	"slideshow_settings_collection_id" integer,
  	"listing_pages_seo_id" integer,
  	"companies_page_settings_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members_gallery" ADD CONSTRAINT "members_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "members_gallery" ADD CONSTRAINT "members_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "members" ADD CONSTRAINT "members_profile_image_id_media_id_fk" FOREIGN KEY ("profile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "members" ADD CONSTRAINT "members_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "members" ADD CONSTRAINT "members_slide_image_id_media_id_fk" FOREIGN KEY ("slide_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "members" ADD CONSTRAINT "members_power_group_id_power_groups_id_fk" FOREIGN KEY ("power_group_id") REFERENCES "public"."power_groups"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog" ADD CONSTRAINT "blog_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog" ADD CONSTRAINT "blog_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog" ADD CONSTRAINT "blog_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_v" ADD CONSTRAINT "_blog_v_parent_id_blog_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_v" ADD CONSTRAINT "_blog_v_version_featured_image_id_media_id_fk" FOREIGN KEY ("version_featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_v" ADD CONSTRAINT "_blog_v_version_author_id_users_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_v" ADD CONSTRAINT "_blog_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "special_requests" ADD CONSTRAINT "special_requests_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "top40" ADD CONSTRAINT "top40_submitted_by_id_users_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "top20" ADD CONSTRAINT "top20_submitted_by_id_users_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "success_stories" ADD CONSTRAINT "success_stories_partner_member_id_users_id_fk" FOREIGN KEY ("partner_member_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "success_stories" ADD CONSTRAINT "success_stories_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "one_to_one_meetings_comments" ADD CONSTRAINT "one_to_one_meetings_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "one_to_one_meetings_comments" ADD CONSTRAINT "one_to_one_meetings_comments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."one_to_one_meetings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "one_to_one_meetings" ADD CONSTRAINT "one_to_one_meetings_met_with_id_users_id_fk" FOREIGN KEY ("met_with_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "one_to_one_meetings" ADD CONSTRAINT "one_to_one_meetings_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "one_to_one_meetings" ADD CONSTRAINT "one_to_one_meetings_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_submissions" ADD CONSTRAINT "event_submissions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wiki_blocks_hero" ADD CONSTRAINT "wiki_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wiki_blocks_hero" ADD CONSTRAINT "wiki_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."wiki"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "wiki_blocks_content_section" ADD CONSTRAINT "wiki_blocks_content_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."wiki"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "wiki_blocks_team_grid" ADD CONSTRAINT "wiki_blocks_team_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."wiki"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "wiki_blocks_faq_items" ADD CONSTRAINT "wiki_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."wiki_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "wiki_blocks_faq" ADD CONSTRAINT "wiki_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."wiki"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "wiki_blocks_contact_info" ADD CONSTRAINT "wiki_blocks_contact_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."wiki"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "wiki" ADD CONSTRAINT "wiki_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wiki_rels" ADD CONSTRAINT "wiki_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."wiki"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "wiki_rels" ADD CONSTRAINT "wiki_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_wiki_v_blocks_hero" ADD CONSTRAINT "_wiki_v_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_wiki_v_blocks_hero" ADD CONSTRAINT "_wiki_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_wiki_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_wiki_v_blocks_content_section" ADD CONSTRAINT "_wiki_v_blocks_content_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_wiki_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_wiki_v_blocks_team_grid" ADD CONSTRAINT "_wiki_v_blocks_team_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_wiki_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_wiki_v_blocks_faq_items" ADD CONSTRAINT "_wiki_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_wiki_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_wiki_v_blocks_faq" ADD CONSTRAINT "_wiki_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_wiki_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_wiki_v_blocks_contact_info" ADD CONSTRAINT "_wiki_v_blocks_contact_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_wiki_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_wiki_v" ADD CONSTRAINT "_wiki_v_parent_id_wiki_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."wiki"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_wiki_v" ADD CONSTRAINT "_wiki_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_wiki_v_rels" ADD CONSTRAINT "_wiki_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_wiki_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_wiki_v_rels" ADD CONSTRAINT "_wiki_v_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_id_users_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "homepage_settings_stats_items" ADD CONSTRAINT "homepage_settings_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."homepage_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage_settings" ADD CONSTRAINT "homepage_settings_hero_background_image_id_media_id_fk" FOREIGN KEY ("hero_background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "homepage_settings" ADD CONSTRAINT "homepage_settings_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contacts_page_settings_contact_persons" ADD CONSTRAINT "contacts_page_settings_contact_persons_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contacts_page_settings_contact_persons" ADD CONSTRAINT "contacts_page_settings_contact_persons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contacts_page_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contacts_page_settings" ADD CONSTRAINT "contacts_page_settings_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_us_settings_chapter_leaders" ADD CONSTRAINT "about_us_settings_chapter_leaders_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_us_settings_chapter_leaders" ADD CONSTRAINT "about_us_settings_chapter_leaders_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_us_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_us_settings_how_we_work_meetings" ADD CONSTRAINT "about_us_settings_how_we_work_meetings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_us_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_us_settings_principles" ADD CONSTRAINT "about_us_settings_principles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_us_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_us_settings_membership_info_benefits" ADD CONSTRAINT "about_us_settings_membership_info_benefits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_us_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_us_settings" ADD CONSTRAINT "about_us_settings_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "faq_settings_faqs" ADD CONSTRAINT "faq_settings_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faq_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faq_settings" ADD CONSTRAINT "faq_settings_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settings_admin_emails" ADD CONSTRAINT "settings_admin_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "settings_schema_same_as" ADD CONSTRAINT "settings_schema_same_as_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "settings" ADD CONSTRAINT "settings_site_logo_id_media_id_fk" FOREIGN KEY ("site_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settings" ADD CONSTRAINT "settings_favicon16_id_media_id_fk" FOREIGN KEY ("favicon16_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settings" ADD CONSTRAINT "settings_favicon32_id_media_id_fk" FOREIGN KEY ("favicon32_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settings" ADD CONSTRAINT "settings_apple_touch_icon_id_media_id_fk" FOREIGN KEY ("apple_touch_icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settings" ADD CONSTRAINT "settings_favicon192_id_media_id_fk" FOREIGN KEY ("favicon192_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settings" ADD CONSTRAINT "settings_favicon512_id_media_id_fk" FOREIGN KEY ("favicon512_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settings" ADD CONSTRAINT "settings_seo_default_og_image_id_media_id_fk" FOREIGN KEY ("seo_default_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settings" ADD CONSTRAINT "settings_schema_organization_logo_id_media_id_fk" FOREIGN KEY ("schema_organization_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lw" ADD CONSTRAINT "lw_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."slideshow_settings_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sm" ADD CONSTRAINT "sm_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sm" ADD CONSTRAINT "sm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."slideshow_settings_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sm_cer" ADD CONSTRAINT "sm_cer_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sm_cer" ADD CONSTRAINT "sm_cer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."slideshow_settings_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pg" ADD CONSTRAINT "pg_power_group_id_power_groups_id_fk" FOREIGN KEY ("power_group_id") REFERENCES "public"."power_groups"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pg" ADD CONSTRAINT "pg_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."slideshow_settings_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gu" ADD CONSTRAINT "gu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."slideshow_settings_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "img" ADD CONSTRAINT "img_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "img" ADD CONSTRAINT "img_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."slideshow_settings_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "slideshow_settings_collection" ADD CONSTRAINT "slideshow_settings_collection_transition_sound_id_media_id_fk" FOREIGN KEY ("transition_sound_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "slideshow_settings_collection_rels" ADD CONSTRAINT "slideshow_settings_collection_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."slideshow_settings_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "slideshow_settings_collection_rels" ADD CONSTRAINT "slideshow_settings_collection_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "listing_pages_seo" ADD CONSTRAINT "listing_pages_seo_blog_page_seo_og_image_id_media_id_fk" FOREIGN KEY ("blog_page_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "listing_pages_seo" ADD CONSTRAINT "listing_pages_seo_events_page_seo_og_image_id_media_id_fk" FOREIGN KEY ("events_page_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "listing_pages_seo" ADD CONSTRAINT "listing_pages_seo_companies_page_seo_og_image_id_media_id_fk" FOREIGN KEY ("companies_page_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "listing_pages_seo" ADD CONSTRAINT "listing_pages_seo_success_stories_page_seo_og_image_id_media_id_fk" FOREIGN KEY ("success_stories_page_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "companies_page_settings" ADD CONSTRAINT "companies_page_settings_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_power_groups_fk" FOREIGN KEY ("power_groups_id") REFERENCES "public"."power_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_special_requests_fk" FOREIGN KEY ("special_requests_id") REFERENCES "public"."special_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_top40_fk" FOREIGN KEY ("top40_id") REFERENCES "public"."top40"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_top20_fk" FOREIGN KEY ("top20_id") REFERENCES "public"."top20"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_success_stories_fk" FOREIGN KEY ("success_stories_id") REFERENCES "public"."success_stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_one_to_one_meetings_fk" FOREIGN KEY ("one_to_one_meetings_id") REFERENCES "public"."one_to_one_meetings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_referrals_fk" FOREIGN KEY ("referrals_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_submissions_fk" FOREIGN KEY ("contact_submissions_id") REFERENCES "public"."contact_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_submissions_fk" FOREIGN KEY ("event_submissions_id") REFERENCES "public"."event_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wiki_fk" FOREIGN KEY ("wiki_id") REFERENCES "public"."wiki"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk" FOREIGN KEY ("audit_logs_id") REFERENCES "public"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_policy_templates_fk" FOREIGN KEY ("policy_templates_id") REFERENCES "public"."policy_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_homepage_settings_fk" FOREIGN KEY ("homepage_settings_id") REFERENCES "public"."homepage_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contacts_page_settings_fk" FOREIGN KEY ("contacts_page_settings_id") REFERENCES "public"."contacts_page_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_about_us_settings_fk" FOREIGN KEY ("about_us_settings_id") REFERENCES "public"."about_us_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faq_settings_fk" FOREIGN KEY ("faq_settings_id") REFERENCES "public"."faq_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_settings_fk" FOREIGN KEY ("settings_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_slideshow_settings_collecti_fk" FOREIGN KEY ("slideshow_settings_collection_id") REFERENCES "public"."slideshow_settings_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_listing_pages_seo_fk" FOREIGN KEY ("listing_pages_seo_id") REFERENCES "public"."listing_pages_seo"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_companies_page_settings_fk" FOREIGN KEY ("companies_page_settings_id") REFERENCES "public"."companies_page_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "power_groups_slug_idx" ON "power_groups" USING btree ("slug");
  CREATE INDEX "power_groups_updated_at_idx" ON "power_groups" USING btree ("updated_at");
  CREATE INDEX "power_groups_created_at_idx" ON "power_groups" USING btree ("created_at");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_name_idx" ON "users" USING btree ("name");
  CREATE INDEX "users_surname_idx" ON "users" USING btree ("surname");
  CREATE INDEX "users_role_idx" ON "users" USING btree ("role");
  CREATE INDEX "users_status_idx" ON "users" USING btree ("status");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "members_gallery_order_idx" ON "members_gallery" USING btree ("_order");
  CREATE INDEX "members_gallery_parent_id_idx" ON "members_gallery" USING btree ("_parent_id");
  CREATE INDEX "members_gallery_image_idx" ON "members_gallery" USING btree ("image_id");
  CREATE INDEX "members_user_idx" ON "members" USING btree ("user_id");
  CREATE INDEX "members_role_idx" ON "members" USING btree ("role");
  CREATE INDEX "members_status_idx" ON "members" USING btree ("status");
  CREATE INDEX "members_name_idx" ON "members" USING btree ("name");
  CREATE INDEX "members_surname_idx" ON "members" USING btree ("surname");
  CREATE INDEX "members_phone_idx" ON "members" USING btree ("phone");
  CREATE INDEX "members_profile_image_idx" ON "members" USING btree ("profile_image_id");
  CREATE INDEX "members_logo_idx" ON "members" USING btree ("logo_id");
  CREATE INDEX "members_slide_image_idx" ON "members" USING btree ("slide_image_id");
  CREATE INDEX "members_company_idx" ON "members" USING btree ("company");
  CREATE INDEX "members_company_phone_idx" ON "members" USING btree ("company_phone");
  CREATE INDEX "members_company_email_idx" ON "members" USING btree ("company_email");
  CREATE INDEX "members_website_idx" ON "members" USING btree ("website");
  CREATE INDEX "members_country_idx" ON "members" USING btree ("country");
  CREATE INDEX "members_power_group_idx" ON "members" USING btree ("power_group_id");
  CREATE INDEX "members_job_position_idx" ON "members" USING btree ("job_position");
  CREATE INDEX "members_org_role_idx" ON "members" USING btree ("org_role");
  CREATE INDEX "members_updated_at_idx" ON "members" USING btree ("updated_at");
  CREATE INDEX "members_created_at_idx" ON "members" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_image_idx" ON "events" USING btree ("image_id");
  CREATE INDEX "events_seo_seo_og_image_idx" ON "events" USING btree ("seo_og_image_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events__status_idx" ON "events" USING btree ("_status");
  CREATE INDEX "_events_v_parent_idx" ON "_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_image_idx" ON "_events_v" USING btree ("version_image_id");
  CREATE INDEX "_events_v_version_seo_version_seo_og_image_idx" ON "_events_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version__status_idx" ON "_events_v" USING btree ("version__status");
  CREATE INDEX "_events_v_created_at_idx" ON "_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "_events_v" USING btree ("updated_at");
  CREATE INDEX "_events_v_latest_idx" ON "_events_v" USING btree ("latest");
  CREATE INDEX "blog_slug_idx" ON "blog" USING btree ("slug");
  CREATE INDEX "blog_featured_image_idx" ON "blog" USING btree ("featured_image_id");
  CREATE INDEX "blog_author_idx" ON "blog" USING btree ("author_id");
  CREATE INDEX "blog_seo_seo_og_image_idx" ON "blog" USING btree ("seo_og_image_id");
  CREATE INDEX "blog_updated_at_idx" ON "blog" USING btree ("updated_at");
  CREATE INDEX "blog_created_at_idx" ON "blog" USING btree ("created_at");
  CREATE INDEX "blog__status_idx" ON "blog" USING btree ("_status");
  CREATE INDEX "_blog_v_parent_idx" ON "_blog_v" USING btree ("parent_id");
  CREATE INDEX "_blog_v_version_version_slug_idx" ON "_blog_v" USING btree ("version_slug");
  CREATE INDEX "_blog_v_version_version_featured_image_idx" ON "_blog_v" USING btree ("version_featured_image_id");
  CREATE INDEX "_blog_v_version_version_author_idx" ON "_blog_v" USING btree ("version_author_id");
  CREATE INDEX "_blog_v_version_seo_version_seo_og_image_idx" ON "_blog_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_blog_v_version_version_updated_at_idx" ON "_blog_v" USING btree ("version_updated_at");
  CREATE INDEX "_blog_v_version_version_created_at_idx" ON "_blog_v" USING btree ("version_created_at");
  CREATE INDEX "_blog_v_version_version__status_idx" ON "_blog_v" USING btree ("version__status");
  CREATE INDEX "_blog_v_created_at_idx" ON "_blog_v" USING btree ("created_at");
  CREATE INDEX "_blog_v_updated_at_idx" ON "_blog_v" USING btree ("updated_at");
  CREATE INDEX "_blog_v_latest_idx" ON "_blog_v" USING btree ("latest");
  CREATE INDEX "special_requests_requested_by_idx" ON "special_requests" USING btree ("requested_by_id");
  CREATE INDEX "special_requests_sort_order_idx" ON "special_requests" USING btree ("sort_order");
  CREATE INDEX "special_requests_show_on_slide_idx" ON "special_requests" USING btree ("show_on_slide");
  CREATE INDEX "special_requests_updated_at_idx" ON "special_requests" USING btree ("updated_at");
  CREATE INDEX "special_requests_created_at_idx" ON "special_requests" USING btree ("created_at");
  CREATE INDEX "top40_submitted_by_idx" ON "top40" USING btree ("submitted_by_id");
  CREATE INDEX "top40_updated_at_idx" ON "top40" USING btree ("updated_at");
  CREATE INDEX "top40_created_at_idx" ON "top40" USING btree ("created_at");
  CREATE INDEX "top20_submitted_by_idx" ON "top20" USING btree ("submitted_by_id");
  CREATE INDEX "top20_updated_at_idx" ON "top20" USING btree ("updated_at");
  CREATE INDEX "top20_created_at_idx" ON "top20" USING btree ("created_at");
  CREATE INDEX "success_stories_partner_member_idx" ON "success_stories" USING btree ("partner_member_id");
  CREATE INDEX "success_stories_author_idx" ON "success_stories" USING btree ("author_id");
  CREATE INDEX "success_stories_updated_at_idx" ON "success_stories" USING btree ("updated_at");
  CREATE INDEX "success_stories_created_at_idx" ON "success_stories" USING btree ("created_at");
  CREATE INDEX "one_to_one_meetings_comments_order_idx" ON "one_to_one_meetings_comments" USING btree ("_order");
  CREATE INDEX "one_to_one_meetings_comments_parent_id_idx" ON "one_to_one_meetings_comments" USING btree ("_parent_id");
  CREATE INDEX "one_to_one_meetings_comments_author_idx" ON "one_to_one_meetings_comments" USING btree ("author_id");
  CREATE INDEX "one_to_one_meetings_met_with_idx" ON "one_to_one_meetings" USING btree ("met_with_id");
  CREATE INDEX "one_to_one_meetings_invited_by_idx" ON "one_to_one_meetings" USING btree ("invited_by_id");
  CREATE INDEX "one_to_one_meetings_created_by_idx" ON "one_to_one_meetings" USING btree ("created_by_id");
  CREATE INDEX "one_to_one_meetings_updated_at_idx" ON "one_to_one_meetings" USING btree ("updated_at");
  CREATE INDEX "one_to_one_meetings_created_at_idx" ON "one_to_one_meetings" USING btree ("created_at");
  CREATE INDEX "referrals_from_user_idx" ON "referrals" USING btree ("from_user_id");
  CREATE INDEX "referrals_to_user_idx" ON "referrals" USING btree ("to_user_id");
  CREATE INDEX "referrals_created_by_idx" ON "referrals" USING btree ("created_by_id");
  CREATE INDEX "referrals_updated_at_idx" ON "referrals" USING btree ("updated_at");
  CREATE INDEX "referrals_created_at_idx" ON "referrals" USING btree ("created_at");
  CREATE INDEX "contact_submissions_updated_at_idx" ON "contact_submissions" USING btree ("updated_at");
  CREATE INDEX "contact_submissions_created_at_idx" ON "contact_submissions" USING btree ("created_at");
  CREATE INDEX "event_submissions_event_idx" ON "event_submissions" USING btree ("event_id");
  CREATE INDEX "event_submissions_updated_at_idx" ON "event_submissions" USING btree ("updated_at");
  CREATE INDEX "event_submissions_created_at_idx" ON "event_submissions" USING btree ("created_at");
  CREATE INDEX "wiki_blocks_hero_order_idx" ON "wiki_blocks_hero" USING btree ("_order");
  CREATE INDEX "wiki_blocks_hero_parent_id_idx" ON "wiki_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "wiki_blocks_hero_path_idx" ON "wiki_blocks_hero" USING btree ("_path");
  CREATE INDEX "wiki_blocks_hero_image_idx" ON "wiki_blocks_hero" USING btree ("image_id");
  CREATE INDEX "wiki_blocks_content_section_order_idx" ON "wiki_blocks_content_section" USING btree ("_order");
  CREATE INDEX "wiki_blocks_content_section_parent_id_idx" ON "wiki_blocks_content_section" USING btree ("_parent_id");
  CREATE INDEX "wiki_blocks_content_section_path_idx" ON "wiki_blocks_content_section" USING btree ("_path");
  CREATE INDEX "wiki_blocks_team_grid_order_idx" ON "wiki_blocks_team_grid" USING btree ("_order");
  CREATE INDEX "wiki_blocks_team_grid_parent_id_idx" ON "wiki_blocks_team_grid" USING btree ("_parent_id");
  CREATE INDEX "wiki_blocks_team_grid_path_idx" ON "wiki_blocks_team_grid" USING btree ("_path");
  CREATE INDEX "wiki_blocks_faq_items_order_idx" ON "wiki_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "wiki_blocks_faq_items_parent_id_idx" ON "wiki_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "wiki_blocks_faq_order_idx" ON "wiki_blocks_faq" USING btree ("_order");
  CREATE INDEX "wiki_blocks_faq_parent_id_idx" ON "wiki_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "wiki_blocks_faq_path_idx" ON "wiki_blocks_faq" USING btree ("_path");
  CREATE INDEX "wiki_blocks_contact_info_order_idx" ON "wiki_blocks_contact_info" USING btree ("_order");
  CREATE INDEX "wiki_blocks_contact_info_parent_id_idx" ON "wiki_blocks_contact_info" USING btree ("_parent_id");
  CREATE INDEX "wiki_blocks_contact_info_path_idx" ON "wiki_blocks_contact_info" USING btree ("_path");
  CREATE INDEX "wiki_slug_idx" ON "wiki" USING btree ("slug");
  CREATE INDEX "wiki_seo_seo_og_image_idx" ON "wiki" USING btree ("seo_og_image_id");
  CREATE INDEX "wiki_updated_at_idx" ON "wiki" USING btree ("updated_at");
  CREATE INDEX "wiki_created_at_idx" ON "wiki" USING btree ("created_at");
  CREATE INDEX "wiki__status_idx" ON "wiki" USING btree ("_status");
  CREATE INDEX "wiki_rels_order_idx" ON "wiki_rels" USING btree ("order");
  CREATE INDEX "wiki_rels_parent_idx" ON "wiki_rels" USING btree ("parent_id");
  CREATE INDEX "wiki_rels_path_idx" ON "wiki_rels" USING btree ("path");
  CREATE INDEX "wiki_rels_members_id_idx" ON "wiki_rels" USING btree ("members_id");
  CREATE INDEX "_wiki_v_blocks_hero_order_idx" ON "_wiki_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_wiki_v_blocks_hero_parent_id_idx" ON "_wiki_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_wiki_v_blocks_hero_path_idx" ON "_wiki_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_wiki_v_blocks_hero_image_idx" ON "_wiki_v_blocks_hero" USING btree ("image_id");
  CREATE INDEX "_wiki_v_blocks_content_section_order_idx" ON "_wiki_v_blocks_content_section" USING btree ("_order");
  CREATE INDEX "_wiki_v_blocks_content_section_parent_id_idx" ON "_wiki_v_blocks_content_section" USING btree ("_parent_id");
  CREATE INDEX "_wiki_v_blocks_content_section_path_idx" ON "_wiki_v_blocks_content_section" USING btree ("_path");
  CREATE INDEX "_wiki_v_blocks_team_grid_order_idx" ON "_wiki_v_blocks_team_grid" USING btree ("_order");
  CREATE INDEX "_wiki_v_blocks_team_grid_parent_id_idx" ON "_wiki_v_blocks_team_grid" USING btree ("_parent_id");
  CREATE INDEX "_wiki_v_blocks_team_grid_path_idx" ON "_wiki_v_blocks_team_grid" USING btree ("_path");
  CREATE INDEX "_wiki_v_blocks_faq_items_order_idx" ON "_wiki_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_wiki_v_blocks_faq_items_parent_id_idx" ON "_wiki_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "_wiki_v_blocks_faq_order_idx" ON "_wiki_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_wiki_v_blocks_faq_parent_id_idx" ON "_wiki_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_wiki_v_blocks_faq_path_idx" ON "_wiki_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_wiki_v_blocks_contact_info_order_idx" ON "_wiki_v_blocks_contact_info" USING btree ("_order");
  CREATE INDEX "_wiki_v_blocks_contact_info_parent_id_idx" ON "_wiki_v_blocks_contact_info" USING btree ("_parent_id");
  CREATE INDEX "_wiki_v_blocks_contact_info_path_idx" ON "_wiki_v_blocks_contact_info" USING btree ("_path");
  CREATE INDEX "_wiki_v_parent_idx" ON "_wiki_v" USING btree ("parent_id");
  CREATE INDEX "_wiki_v_version_version_slug_idx" ON "_wiki_v" USING btree ("version_slug");
  CREATE INDEX "_wiki_v_version_seo_version_seo_og_image_idx" ON "_wiki_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_wiki_v_version_version_updated_at_idx" ON "_wiki_v" USING btree ("version_updated_at");
  CREATE INDEX "_wiki_v_version_version_created_at_idx" ON "_wiki_v" USING btree ("version_created_at");
  CREATE INDEX "_wiki_v_version_version__status_idx" ON "_wiki_v" USING btree ("version__status");
  CREATE INDEX "_wiki_v_created_at_idx" ON "_wiki_v" USING btree ("created_at");
  CREATE INDEX "_wiki_v_updated_at_idx" ON "_wiki_v" USING btree ("updated_at");
  CREATE INDEX "_wiki_v_latest_idx" ON "_wiki_v" USING btree ("latest");
  CREATE INDEX "_wiki_v_rels_order_idx" ON "_wiki_v_rels" USING btree ("order");
  CREATE INDEX "_wiki_v_rels_parent_idx" ON "_wiki_v_rels" USING btree ("parent_id");
  CREATE INDEX "_wiki_v_rels_path_idx" ON "_wiki_v_rels" USING btree ("path");
  CREATE INDEX "_wiki_v_rels_members_id_idx" ON "_wiki_v_rels" USING btree ("members_id");
  CREATE INDEX "audit_logs_performed_by_idx" ON "audit_logs" USING btree ("performed_by_id");
  CREATE INDEX "audit_logs_expires_at_idx" ON "audit_logs" USING btree ("expires_at");
  CREATE INDEX "audit_logs_updated_at_idx" ON "audit_logs" USING btree ("updated_at");
  CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
  CREATE INDEX "policy_templates_updated_at_idx" ON "policy_templates" USING btree ("updated_at");
  CREATE INDEX "policy_templates_created_at_idx" ON "policy_templates" USING btree ("created_at");
  CREATE INDEX "homepage_settings_stats_items_order_idx" ON "homepage_settings_stats_items" USING btree ("_order");
  CREATE INDEX "homepage_settings_stats_items_parent_id_idx" ON "homepage_settings_stats_items" USING btree ("_parent_id");
  CREATE INDEX "homepage_settings_hero_hero_background_image_idx" ON "homepage_settings" USING btree ("hero_background_image_id");
  CREATE INDEX "homepage_settings_seo_seo_og_image_idx" ON "homepage_settings" USING btree ("seo_og_image_id");
  CREATE INDEX "homepage_settings_updated_at_idx" ON "homepage_settings" USING btree ("updated_at");
  CREATE INDEX "homepage_settings_created_at_idx" ON "homepage_settings" USING btree ("created_at");
  CREATE INDEX "contacts_page_settings_contact_persons_order_idx" ON "contacts_page_settings_contact_persons" USING btree ("_order");
  CREATE INDEX "contacts_page_settings_contact_persons_parent_id_idx" ON "contacts_page_settings_contact_persons" USING btree ("_parent_id");
  CREATE INDEX "contacts_page_settings_contact_persons_member_idx" ON "contacts_page_settings_contact_persons" USING btree ("member_id");
  CREATE INDEX "contacts_page_settings_seo_seo_og_image_idx" ON "contacts_page_settings" USING btree ("seo_og_image_id");
  CREATE INDEX "contacts_page_settings_updated_at_idx" ON "contacts_page_settings" USING btree ("updated_at");
  CREATE INDEX "contacts_page_settings_created_at_idx" ON "contacts_page_settings" USING btree ("created_at");
  CREATE INDEX "about_us_settings_chapter_leaders_order_idx" ON "about_us_settings_chapter_leaders" USING btree ("_order");
  CREATE INDEX "about_us_settings_chapter_leaders_parent_id_idx" ON "about_us_settings_chapter_leaders" USING btree ("_parent_id");
  CREATE INDEX "about_us_settings_chapter_leaders_member_idx" ON "about_us_settings_chapter_leaders" USING btree ("member_id");
  CREATE INDEX "about_us_settings_how_we_work_meetings_order_idx" ON "about_us_settings_how_we_work_meetings" USING btree ("_order");
  CREATE INDEX "about_us_settings_how_we_work_meetings_parent_id_idx" ON "about_us_settings_how_we_work_meetings" USING btree ("_parent_id");
  CREATE INDEX "about_us_settings_principles_order_idx" ON "about_us_settings_principles" USING btree ("_order");
  CREATE INDEX "about_us_settings_principles_parent_id_idx" ON "about_us_settings_principles" USING btree ("_parent_id");
  CREATE INDEX "about_us_settings_membership_info_benefits_order_idx" ON "about_us_settings_membership_info_benefits" USING btree ("_order");
  CREATE INDEX "about_us_settings_membership_info_benefits_parent_id_idx" ON "about_us_settings_membership_info_benefits" USING btree ("_parent_id");
  CREATE INDEX "about_us_settings_seo_seo_og_image_idx" ON "about_us_settings" USING btree ("seo_og_image_id");
  CREATE INDEX "about_us_settings_updated_at_idx" ON "about_us_settings" USING btree ("updated_at");
  CREATE INDEX "about_us_settings_created_at_idx" ON "about_us_settings" USING btree ("created_at");
  CREATE INDEX "faq_settings_faqs_order_idx" ON "faq_settings_faqs" USING btree ("_order");
  CREATE INDEX "faq_settings_faqs_parent_id_idx" ON "faq_settings_faqs" USING btree ("_parent_id");
  CREATE INDEX "faq_settings_seo_seo_og_image_idx" ON "faq_settings" USING btree ("seo_og_image_id");
  CREATE INDEX "faq_settings_updated_at_idx" ON "faq_settings" USING btree ("updated_at");
  CREATE INDEX "faq_settings_created_at_idx" ON "faq_settings" USING btree ("created_at");
  CREATE INDEX "settings_admin_emails_order_idx" ON "settings_admin_emails" USING btree ("_order");
  CREATE INDEX "settings_admin_emails_parent_id_idx" ON "settings_admin_emails" USING btree ("_parent_id");
  CREATE INDEX "settings_schema_same_as_order_idx" ON "settings_schema_same_as" USING btree ("_order");
  CREATE INDEX "settings_schema_same_as_parent_id_idx" ON "settings_schema_same_as" USING btree ("_parent_id");
  CREATE INDEX "settings_site_logo_idx" ON "settings" USING btree ("site_logo_id");
  CREATE INDEX "settings_favicon16_idx" ON "settings" USING btree ("favicon16_id");
  CREATE INDEX "settings_favicon32_idx" ON "settings" USING btree ("favicon32_id");
  CREATE INDEX "settings_apple_touch_icon_idx" ON "settings" USING btree ("apple_touch_icon_id");
  CREATE INDEX "settings_favicon192_idx" ON "settings" USING btree ("favicon192_id");
  CREATE INDEX "settings_favicon512_idx" ON "settings" USING btree ("favicon512_id");
  CREATE INDEX "settings_seo_seo_default_og_image_idx" ON "settings" USING btree ("seo_default_og_image_id");
  CREATE INDEX "settings_schema_schema_organization_logo_idx" ON "settings" USING btree ("schema_organization_logo_id");
  CREATE INDEX "settings_updated_at_idx" ON "settings" USING btree ("updated_at");
  CREATE INDEX "settings_created_at_idx" ON "settings" USING btree ("created_at");
  CREATE INDEX "lw_order_idx" ON "lw" USING btree ("_order");
  CREATE INDEX "lw_parent_id_idx" ON "lw" USING btree ("_parent_id");
  CREATE INDEX "lw_path_idx" ON "lw" USING btree ("_path");
  CREATE INDEX "sm_order_idx" ON "sm" USING btree ("_order");
  CREATE INDEX "sm_parent_id_idx" ON "sm" USING btree ("_parent_id");
  CREATE INDEX "sm_path_idx" ON "sm" USING btree ("_path");
  CREATE INDEX "sm_member_idx" ON "sm" USING btree ("member_id");
  CREATE INDEX "sm_cer_order_idx" ON "sm_cer" USING btree ("_order");
  CREATE INDEX "sm_cer_parent_id_idx" ON "sm_cer" USING btree ("_parent_id");
  CREATE INDEX "sm_cer_path_idx" ON "sm_cer" USING btree ("_path");
  CREATE INDEX "sm_cer_member_idx" ON "sm_cer" USING btree ("member_id");
  CREATE INDEX "pg_order_idx" ON "pg" USING btree ("_order");
  CREATE INDEX "pg_parent_id_idx" ON "pg" USING btree ("_parent_id");
  CREATE INDEX "pg_path_idx" ON "pg" USING btree ("_path");
  CREATE INDEX "pg_power_group_idx" ON "pg" USING btree ("power_group_id");
  CREATE INDEX "gu_order_idx" ON "gu" USING btree ("_order");
  CREATE INDEX "gu_parent_id_idx" ON "gu" USING btree ("_parent_id");
  CREATE INDEX "gu_path_idx" ON "gu" USING btree ("_path");
  CREATE INDEX "img_order_idx" ON "img" USING btree ("_order");
  CREATE INDEX "img_parent_id_idx" ON "img" USING btree ("_parent_id");
  CREATE INDEX "img_path_idx" ON "img" USING btree ("_path");
  CREATE INDEX "img_image_idx" ON "img" USING btree ("image_id");
  CREATE INDEX "slideshow_settings_collection_transition_sound_idx" ON "slideshow_settings_collection" USING btree ("transition_sound_id");
  CREATE INDEX "slideshow_settings_collection_updated_at_idx" ON "slideshow_settings_collection" USING btree ("updated_at");
  CREATE INDEX "slideshow_settings_collection_created_at_idx" ON "slideshow_settings_collection" USING btree ("created_at");
  CREATE INDEX "slideshow_settings_collection_rels_order_idx" ON "slideshow_settings_collection_rels" USING btree ("order");
  CREATE INDEX "slideshow_settings_collection_rels_parent_idx" ON "slideshow_settings_collection_rels" USING btree ("parent_id");
  CREATE INDEX "slideshow_settings_collection_rels_path_idx" ON "slideshow_settings_collection_rels" USING btree ("path");
  CREATE INDEX "slideshow_settings_collection_rels_members_id_idx" ON "slideshow_settings_collection_rels" USING btree ("members_id");
  CREATE INDEX "listing_pages_seo_blog_page_seo_blog_page_seo_og_image_idx" ON "listing_pages_seo" USING btree ("blog_page_seo_og_image_id");
  CREATE INDEX "listing_pages_seo_events_page_seo_events_page_seo_og_ima_idx" ON "listing_pages_seo" USING btree ("events_page_seo_og_image_id");
  CREATE INDEX "listing_pages_seo_companies_page_seo_companies_page_seo__idx" ON "listing_pages_seo" USING btree ("companies_page_seo_og_image_id");
  CREATE INDEX "listing_pages_seo_success_stories_page_seo_success_stori_idx" ON "listing_pages_seo" USING btree ("success_stories_page_seo_og_image_id");
  CREATE INDEX "listing_pages_seo_updated_at_idx" ON "listing_pages_seo" USING btree ("updated_at");
  CREATE INDEX "listing_pages_seo_created_at_idx" ON "listing_pages_seo" USING btree ("created_at");
  CREATE INDEX "companies_page_settings_seo_seo_og_image_idx" ON "companies_page_settings" USING btree ("seo_og_image_id");
  CREATE INDEX "companies_page_settings_updated_at_idx" ON "companies_page_settings" USING btree ("updated_at");
  CREATE INDEX "companies_page_settings_created_at_idx" ON "companies_page_settings" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_power_groups_id_idx" ON "payload_locked_documents_rels" USING btree ("power_groups_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_members_id_idx" ON "payload_locked_documents_rels" USING btree ("members_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_blog_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_id");
  CREATE INDEX "payload_locked_documents_rels_special_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("special_requests_id");
  CREATE INDEX "payload_locked_documents_rels_top40_id_idx" ON "payload_locked_documents_rels" USING btree ("top40_id");
  CREATE INDEX "payload_locked_documents_rels_top20_id_idx" ON "payload_locked_documents_rels" USING btree ("top20_id");
  CREATE INDEX "payload_locked_documents_rels_success_stories_id_idx" ON "payload_locked_documents_rels" USING btree ("success_stories_id");
  CREATE INDEX "payload_locked_documents_rels_one_to_one_meetings_id_idx" ON "payload_locked_documents_rels" USING btree ("one_to_one_meetings_id");
  CREATE INDEX "payload_locked_documents_rels_referrals_id_idx" ON "payload_locked_documents_rels" USING btree ("referrals_id");
  CREATE INDEX "payload_locked_documents_rels_contact_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("contact_submissions_id");
  CREATE INDEX "payload_locked_documents_rels_event_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("event_submissions_id");
  CREATE INDEX "payload_locked_documents_rels_wiki_id_idx" ON "payload_locked_documents_rels" USING btree ("wiki_id");
  CREATE INDEX "payload_locked_documents_rels_audit_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_logs_id");
  CREATE INDEX "payload_locked_documents_rels_policy_templates_id_idx" ON "payload_locked_documents_rels" USING btree ("policy_templates_id");
  CREATE INDEX "payload_locked_documents_rels_homepage_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("homepage_settings_id");
  CREATE INDEX "payload_locked_documents_rels_contacts_page_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("contacts_page_settings_id");
  CREATE INDEX "payload_locked_documents_rels_about_us_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("about_us_settings_id");
  CREATE INDEX "payload_locked_documents_rels_faq_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("faq_settings_id");
  CREATE INDEX "payload_locked_documents_rels_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("settings_id");
  CREATE INDEX "payload_locked_documents_rels_slideshow_settings_collect_idx" ON "payload_locked_documents_rels" USING btree ("slideshow_settings_collection_id");
  CREATE INDEX "payload_locked_documents_rels_listing_pages_seo_id_idx" ON "payload_locked_documents_rels" USING btree ("listing_pages_seo_id");
  CREATE INDEX "payload_locked_documents_rels_companies_page_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("companies_page_settings_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "power_groups" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "members_gallery" CASCADE;
  DROP TABLE "members" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "_events_v" CASCADE;
  DROP TABLE "blog" CASCADE;
  DROP TABLE "_blog_v" CASCADE;
  DROP TABLE "special_requests" CASCADE;
  DROP TABLE "top40" CASCADE;
  DROP TABLE "top20" CASCADE;
  DROP TABLE "success_stories" CASCADE;
  DROP TABLE "one_to_one_meetings_comments" CASCADE;
  DROP TABLE "one_to_one_meetings" CASCADE;
  DROP TABLE "referrals" CASCADE;
  DROP TABLE "contact_submissions" CASCADE;
  DROP TABLE "event_submissions" CASCADE;
  DROP TABLE "wiki_blocks_hero" CASCADE;
  DROP TABLE "wiki_blocks_content_section" CASCADE;
  DROP TABLE "wiki_blocks_team_grid" CASCADE;
  DROP TABLE "wiki_blocks_faq_items" CASCADE;
  DROP TABLE "wiki_blocks_faq" CASCADE;
  DROP TABLE "wiki_blocks_contact_info" CASCADE;
  DROP TABLE "wiki" CASCADE;
  DROP TABLE "wiki_rels" CASCADE;
  DROP TABLE "_wiki_v_blocks_hero" CASCADE;
  DROP TABLE "_wiki_v_blocks_content_section" CASCADE;
  DROP TABLE "_wiki_v_blocks_team_grid" CASCADE;
  DROP TABLE "_wiki_v_blocks_faq_items" CASCADE;
  DROP TABLE "_wiki_v_blocks_faq" CASCADE;
  DROP TABLE "_wiki_v_blocks_contact_info" CASCADE;
  DROP TABLE "_wiki_v" CASCADE;
  DROP TABLE "_wiki_v_rels" CASCADE;
  DROP TABLE "audit_logs" CASCADE;
  DROP TABLE "policy_templates" CASCADE;
  DROP TABLE "homepage_settings_stats_items" CASCADE;
  DROP TABLE "homepage_settings" CASCADE;
  DROP TABLE "contacts_page_settings_contact_persons" CASCADE;
  DROP TABLE "contacts_page_settings" CASCADE;
  DROP TABLE "about_us_settings_chapter_leaders" CASCADE;
  DROP TABLE "about_us_settings_how_we_work_meetings" CASCADE;
  DROP TABLE "about_us_settings_principles" CASCADE;
  DROP TABLE "about_us_settings_membership_info_benefits" CASCADE;
  DROP TABLE "about_us_settings" CASCADE;
  DROP TABLE "faq_settings_faqs" CASCADE;
  DROP TABLE "faq_settings" CASCADE;
  DROP TABLE "settings_admin_emails" CASCADE;
  DROP TABLE "settings_schema_same_as" CASCADE;
  DROP TABLE "settings" CASCADE;
  DROP TABLE "lw" CASCADE;
  DROP TABLE "sm" CASCADE;
  DROP TABLE "sm_cer" CASCADE;
  DROP TABLE "pg" CASCADE;
  DROP TABLE "gu" CASCADE;
  DROP TABLE "img" CASCADE;
  DROP TABLE "slideshow_settings_collection" CASCADE;
  DROP TABLE "slideshow_settings_collection_rels" CASCADE;
  DROP TABLE "listing_pages_seo" CASCADE;
  DROP TABLE "companies_page_settings" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_users_status";
  DROP TYPE "public"."enum_members_role";
  DROP TYPE "public"."enum_members_status";
  DROP TYPE "public"."enum_members_slide_image_mode";
  DROP TYPE "public"."enum_members_attendance_type";
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum__events_v_version_status";
  DROP TYPE "public"."enum_blog_status";
  DROP TYPE "public"."enum__blog_v_version_status";
  DROP TYPE "public"."enum_special_requests_status";
  DROP TYPE "public"."enum_referrals_status";
  DROP TYPE "public"."enum_contact_submissions_status";
  DROP TYPE "public"."enum_event_submissions_status";
  DROP TYPE "public"."enum_wiki_status";
  DROP TYPE "public"."enum__wiki_v_version_status";
  DROP TYPE "public"."enum_audit_logs_action";
  DROP TYPE "public"."enum_audit_logs_target_type";
  DROP TYPE "public"."enum_policy_templates_type";
  DROP TYPE "public"."enum_policy_templates_locale";
  DROP TYPE "public"."enum_faq_settings_faqs_category";
  DROP TYPE "public"."enum_settings_locale";
  DROP TYPE "public"."enum_settings_seo_twitter_card";
  DROP TYPE "public"."enum_settings_schema_organization_type";
  DROP TYPE "public"."enum_img_display_mode";`)
}
