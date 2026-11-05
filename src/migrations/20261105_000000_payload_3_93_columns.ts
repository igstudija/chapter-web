import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Columns Payload 3.93 declares that 3.69 did not.
 *
 * - `users.reset_password_requested_at` — auth collections record when a reset
 *   was last asked for, so forgot-password can be throttled.
 * - `media._objectkey` — the cloud-storage plugin keeps the storage object key
 *   on every upload document.
 *
 * Payload names every declared column in its `SELECT`, so a 3.93 build reading
 * a database without these answers 500 on login and on every media query. This
 * is the expand half only — nothing is dropped — so it is safe to run **before**
 * deploying the upgraded build, and the old build keeps working against it.
 *
 * Written by hand: the last snapshot is older than the hand-written
 * 20260801 migration, so a generated diff would repeat that one as well.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_password_requested_at" timestamp(3) with time zone;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "media" DROP COLUMN IF EXISTS "_objectkey";
  ALTER TABLE "users" DROP COLUMN IF EXISTS "reset_password_requested_at";
  `)
}
