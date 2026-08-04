import 'dotenv/config'
import { checkConfiguration, hasFatal } from '../lib/configCheck'
import { IS_SERVERLESS } from '../lib/runtime'

/**
 * Preflight — the instant, offline half of configuration checking.
 *
 * Chained into the `dev` and `start` scripts rather than installed as a
 * `predev` hook: pnpm ships with pre/post scripts disabled by default, so the
 * hook would silently never fire, which is the exact failure a preflight check
 * exists to prevent. See ADR 0002.
 *
 * It makes no network calls. Whether the database actually answers, whether the
 * storage bucket is public, whether the mail server accepts us — those need the
 * network and belong to `pnpm diagnose`.
 */

const findings = checkConfiguration(process.env, { isServerless: IS_SERVERLESS })

if (findings.length === 0) {
  process.exit(0)
}

const fatal = findings.filter((f) => f.severity === 'fatal')
const degraded = findings.filter((f) => f.severity === 'degraded')

// Warnings first, so that when the process is about to stop, the reason it
// stopped is the last thing on screen rather than scrolled away.
for (const finding of degraded) {
  console.warn(`⚠ ${finding.message}`)
}

if (fatal.length === 0) {
  console.warn('\nStarting anyway. Fix these in .env when you need those features.\n')
  process.exit(0)
}

console.error(`\n✖ Cannot start — ${fatal.length === 1 ? 'a setting is' : 'settings are'} missing:\n`)
for (const finding of fatal) {
  console.error(`  ${finding.message}`)
}
console.error(`
Set them in .env — see .env.example for where each value comes from.
To check the infrastructure those values point at, run: pnpm diagnose
`)

process.exit(1)
