import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Drops the `spotlight` member-slide template — it had converged on Cover.
 *
 * Members sitting on it move to `cover` first: the generated migration cast the
 * column straight back to the rebuilt enum, which fails on any surviving
 * `spotlight` row.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "members" SET "slide_template" = 'cover' WHERE "slide_template" = 'spotlight';
  ALTER TABLE "members" ALTER COLUMN "slide_template" SET DATA TYPE text;
  ALTER TABLE "members" ALTER COLUMN "slide_template" SET DEFAULT 'classic'::text;
  DROP TYPE IF EXISTS "public"."enum_members_slide_template";
  CREATE TYPE "public"."enum_members_slide_template" AS ENUM('classic', 'cover', 'reels');
  ALTER TABLE "members" ALTER COLUMN "slide_template" SET DEFAULT 'classic'::"public"."enum_members_slide_template";
  ALTER TABLE "members" ALTER COLUMN "slide_template" SET DATA TYPE "public"."enum_members_slide_template" USING "slide_template"::"public"."enum_members_slide_template";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_members_slide_template" ADD VALUE IF NOT EXISTS 'spotlight' BEFORE 'cover';`)
}
