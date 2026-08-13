import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { backfillMissingVersions } from '../lib/documentVersions'

/**
 * Give every document in a drafts-enabled collection the version row the admin
 * list needs to see it. See `lib/documentVersions.ts` for why the row is what
 * the list actually reads.
 *
 * The dev server repairs this by itself on start-up, so this script is for the
 * cases that never touch a dev server: a restore into the production database,
 * a check from CI, or wanting to see the damage before fixing it.
 *
 *   pnpm backfill:versions            # report only
 *   pnpm backfill:versions --apply    # write the missing versions
 */

const APPLY = process.argv.includes('--apply')

// `onInit` repairs this on a dev server, and would fire here too — turning a
// dry run into a silent write and reporting nothing left to do. Set before
// `getPayload`, which is what runs `onInit`.
process.env.PAYLOAD_SKIP_VERSION_BACKFILL = '1'

const payload = await getPayload({ config })
const reports = await backfillMissingVersions(payload, { apply: APPLY })

let totalMissing = 0
let totalFixed = 0

for (const report of reports) {
  totalMissing += report.missing.length
  totalFixed += report.backfilled

  if (report.missing.length === 0) {
    payload.logger.info(`${report.collection}: ${report.total} docs, all versioned`)
    continue
  }

  payload.logger.warn(
    `${report.collection}: ${report.missing.length} of ${report.total} docs have no version row -> invisible in the admin list`,
  )
  if (APPLY) payload.logger.info(`${report.collection}: backfilled ${report.backfilled}`)
  for (const failure of report.failed) {
    payload.logger.error(`${report.collection}#${failure.id}: ${failure.error}`)
  }
}

if (totalMissing === 0) {
  payload.logger.info('Nothing to backfill.')
} else if (APPLY) {
  payload.logger.info(`Backfilled ${totalFixed} of ${totalMissing} documents.`)
} else {
  payload.logger.info(
    `Dry run: ${totalMissing} documents would get a version row. Re-run with --apply.`,
  )
}

// A non-zero exit is what makes this usable as a check: a dry run that found
// orphans, or an --apply run that could not repair them all, is a failure.
process.exit(totalMissing > totalFixed ? 1 : 0)
