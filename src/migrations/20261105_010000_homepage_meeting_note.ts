import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Homepage hero: `meetingNote`, the sentence that says when, where and how
 * often the group meets. It used to live only on the Companies page and in
 * event descriptions, so a first-time visitor had to go looking for it.
 *
 * Additive and nullable, so it can run before or after the deploy.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "homepage_settings" ADD COLUMN IF NOT EXISTS "hero_meeting_note" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "homepage_settings" DROP COLUMN IF EXISTS "hero_meeting_note";
  `)
}
