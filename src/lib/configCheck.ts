/**
 * What "correctly configured" means, in one place.
 *
 * This is a pure function over a plain record of values. It opens no
 * connections and reads no globals, so the rules can be tested without a
 * process, a network or a database — and so Preflight and Diagnose can share
 * one definition rather than drifting apart.
 *
 * Severity is graded by consequence rather than by a `required` flag, which is
 * the distinction the docs used to blur: the README called four settings
 * required while `.env.example` described mail as required too, and both were
 * describing different things. See ADR 0002.
 */

/** What breaks when a setting is absent. */
export type Severity =
  /** The process cannot usefully start. */
  | 'fatal'
  /** The app runs, but a named capability is dead. */
  | 'degraded'

export type Finding = {
  severity: Severity
  /** The settings this finding is about — more than one when they share a capability. */
  settings: string[]
  /** A sentence for a human who has never read this codebase. */
  message: string
}

type Values = Record<string, string | undefined>

/**
 * A capability the install loses when its settings are missing. Grouping by
 * capability rather than by variable is what lets the warning say "invitations
 * and password resets will not work" instead of naming an environment variable
 * and leaving the reader to work out the consequence.
 */
type Capability = {
  name: string
  settings: string[]
  /** Completed by "…, so <consequence>." */
  consequence: string
}

/** Settings without which the process should not start. */
const FATAL: Array<{
  setting: string
  purpose: string
  /** Returns a problem with a present value, or null when it looks plausible. */
  malformed?: (value: string) => string | null
}> = [
  {
    setting: 'PAYLOAD_SECRET',
    purpose: 'signs session tokens. Generate one with: openssl rand -base64 32',
  },
  {
    setting: 'POSTGRESS_DATABASE_URL',
    purpose:
      'is the Postgres connection string. From Supabase: Project Settings → Database → Connection string',
    malformed: (value) =>
      /^postgres(ql)?:\/\/.+/.test(value)
        ? null
        : 'does not look like a connection string — it should begin with postgresql://',
  },
]

/** Capabilities that switch off quietly when their settings are absent. */
const DEGRADED: Capability[] = [
  {
    name: 'Email',
    settings: ['SMTP_HOST'],
    consequence: 'invitations and password resets will not work',
  },
  {
    name: 'File storage',
    settings: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    consequence: 'photos, logos and every other upload will fail',
  },
]

/** Every setting this function knows about, for documentation and tests. */
export const KNOWN_SETTINGS: string[] = [
  ...FATAL.map((f) => f.setting),
  ...DEGRADED.flatMap((c) => c.settings),
]

const missing = (values: Values, setting: string): boolean => !values[setting]?.trim()

/**
 * Inspect configuration and describe everything wrong with it.
 *
 * Returns every problem rather than the first, because a Self-hoster filling in
 * a fresh `.env` should learn what is missing once, not one restart at a time.
 */
export const checkConfiguration = (values: Values): Finding[] => {
  const findings: Finding[] = []

  for (const { setting, purpose, malformed } of FATAL) {
    const value = values[setting]?.trim()

    if (!value) {
      findings.push({
        severity: 'fatal',
        settings: [setting],
        message: `${setting} is not set. It ${purpose}.`,
      })
      continue
    }

    // A value that is present but wrong is a different mistake from an absent
    // one, and saying so saves the reader from checking whether they set it.
    const problem = malformed?.(value)
    if (problem) {
      findings.push({
        severity: 'fatal',
        settings: [setting],
        message: `${setting} ${problem}.`,
      })
    }
  }

  for (const capability of DEGRADED) {
    const absent = capability.settings.filter((setting) => missing(values, setting))
    if (absent.length === 0) continue

    findings.push({
      severity: 'degraded',
      settings: absent,
      message: `${capability.name} is not configured (${absent.join(', ')}), so ${capability.consequence}.`,
    })
  }

  return findings
}

export const hasFatal = (findings: Finding[]): boolean =>
  findings.some((finding) => finding.severity === 'fatal')
