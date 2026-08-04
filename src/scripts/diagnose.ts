import 'dotenv/config'
import { checkConfiguration, hasFatal } from '../lib/configCheck'
import {
  checkDataApi,
  checkDatabase,
  checkMail,
  checkStorage,
  openDatabase,
  type Outcome,
} from '../lib/infraChecks'
import { fetchPartner } from '../lib/chapterExchange/fetchPartner'
import { decodeConnectionKey } from '../lib/chapterExchange/connectionKey'

/**
 * Diagnose — the network-touching half of configuration checking.
 *
 * Preflight can tell you a setting is absent. Only this can tell you the value
 * you typed is wrong: that the host does not answer, that the password is
 * rejected, that the bucket you named is private. It runs by hand and never as
 * a side effect, because it is slow and fails without a network. See ADR 0002.
 *
 * Named `diagnose` because pnpm owns `doctor` — ADR 0004.
 *
 * The checks themselves live in `lib/infraChecks`, where `pnpm wizard` calls
 * the same ones against values somebody has just typed. This file is what turns
 * their answers into a report and an exit code.
 *
 * Storage is checked against Supabase specifically. That is the tier 1 path
 * rather than one option among equals (ADR 0001); a tier 3 install has replaced
 * the storage seam and knows it.
 */

const report = (label: string, outcome: Outcome): void => {
  const mark = outcome.skipped ? '–' : outcome.ok ? '✓' : '✖'
  console.log(`${mark} ${label}: ${outcome.detail}`)
  if (outcome.fix) console.log(`    ${outcome.fix}`)
}

/**
 * The chapters this install is linked to.
 *
 * A partner that stops answering is dropped from the members list in silence
 * (ADR 0007), which makes this the only place anyone finds out. Read straight
 * from Postgres rather than through Payload: this script never boots the app.
 */
const checkChapterLinks = async (): Promise<Outcome> => {
  const url = process.env.POSTGRESS_DATABASE_URL
  if (!url) return { ok: true, detail: 'no database configured', skipped: true }

  // Opened the same way every other check opens it, so that a tier 2 Postgres
  // without TLS is not reported as a broken install (ADR 0001).
  let client
  try {
    client = await openDatabase(url)
  } catch {
    // checkDatabase has already said why, in detail.
    return { ok: false, skipped: true, detail: 'the database did not answer' }
  }

  try {
    const exists = await client.query("SELECT to_regclass('public.chapter_connections') AS t")
    if (!exists.rows[0]?.t) {
      return { ok: true, detail: 'not set up on this install', skipped: true }
    }

    const { rows } = await client.query(
      'SELECT id, name, their_key, paused FROM chapter_connections ORDER BY name',
    )
    if (rows.length === 0) {
      return { ok: true, detail: 'no chapters linked', skipped: true }
    }

    const lines: string[] = []
    let failures = 0

    for (const row of rows) {
      if (row.paused) {
        lines.push(`${row.name}: paused`)
        continue
      }
      if (!row.their_key) {
        // A one-way link is a supported shape, not a fault.
        lines.push(`${row.name}: we share with them, we do not read them`)
        continue
      }
      if (!decodeConnectionKey(row.their_key)) {
        lines.push(`${row.name}: their key is not readable`)
        failures += 1
        continue
      }

      const answer = await fetchPartner({ name: row.name, theirKey: row.their_key })
      if (answer) {
        lines.push(`${row.name}: answered with ${answer.requests.length} request(s)`)
      } else {
        lines.push(`${row.name}: did not answer`)
        failures += 1
      }
    }

    return {
      ok: failures === 0,
      detail: `${rows.length} linked\n    ${lines.join('\n    ')}`,
      fix:
        failures > 0
          ? 'Ask the other chapter whether their install is up, or re-exchange keys.'
          : undefined,
    }
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : 'could not be read',
    }
  } finally {
    await client.end().catch(() => {})
  }
}

const main = async (): Promise<void> => {
  console.log('\nChecking the infrastructure this install points at.\n')

  const configFindings = checkConfiguration(process.env)
  for (const finding of configFindings) {
    console.log(`${finding.severity === 'fatal' ? '✖' : '⚠'} Configuration: ${finding.message}`)
  }
  if (configFindings.length > 0) console.log('')

  const [database, dataApi, storage, mail, chapterLinks] = await Promise.all([
    checkDatabase(process.env.POSTGRESS_DATABASE_URL),
    checkDataApi(process.env.POSTGRESS_DATABASE_URL),
    checkStorage({
      url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      bucket: process.env.SUPABASE_STORAGE_BUCKET,
    }),
    checkMail({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }),
    checkChapterLinks(),
  ])

  report('Database', database)
  report('Data API', dataApi)
  report('Storage', storage)
  report('Email', mail)
  report('Chapter links', chapterLinks)

  // Skipped checks are not failures on their own — a missing optional setting
  // is already reported by the configuration pass above, with its real
  // severity. What fails the run is a value that is present and wrong.
  const failed = [database, dataApi, storage, mail, chapterLinks].filter(
    (outcome) => !outcome.ok && !outcome.skipped,
  )

  if (failed.length === 0 && !hasFatal(configFindings)) {
    console.log('\nEverything this can check from here answers correctly.\n')
    process.exit(0)
  }

  console.log(`\n${failed.length} check${failed.length === 1 ? '' : 's'} failed.\n`)
  process.exit(1)
}

main().catch((error) => {
  console.error('\nDiagnosis could not complete:', error instanceof Error ? error.message : error)
  process.exit(1)
})
