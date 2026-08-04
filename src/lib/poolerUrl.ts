/**
 * One connection string, correct on every host.
 *
 * Supabase's pooler answers on two ports and they are not interchangeable.
 * Session mode (5432) hands a client a connection and keeps it until that
 * client disconnects; transaction mode (6543) lends one out per transaction and
 * multiplexes everybody onto a handful of real backends.
 *
 * Which one is right depends on the host, not on the person configuring it:
 *
 * - Serverless needs 6543. Every instance opens its own connections and lives
 *   briefly, so session mode empties the pool under load — the failure arrives
 *   hours after deploy, as 500s during the busiest moment, not at boot.
 * - A long-running host, and every migration run from a laptop, needs 5432.
 *   Schema changes hold advisory locks and temporary state across statements,
 *   and the transaction pooler is free to answer each one from a different
 *   backend.
 *
 * Asking each developer to keep two values straight is what actually broke
 * production here: `.env` and the deploy each looked deliberate on their own,
 * so nothing revealed the mismatch until the site started failing. This module
 * removes the choice instead of documenting it. Put the string your dashboard
 * shows in one place, use it everywhere, and let the port follow the host.
 *
 * Only `pooler.supabase.com` hosts are touched. A plain Postgres on 5432 —
 * Docker, a managed instance, a colleague's machine — is not Supavisor and
 * nothing here applies to it.
 */

const SESSION_PORT = '5432'
const TRANSACTION_PORT = '6543'
const POOLER_HOST = 'pooler.supabase.com'

export type PoolerResolution = {
  /** The connection string to actually connect with. */
  url: string
  /** Set when the port was changed, for a one-line log. */
  adjusted?: { from: string; to: string }
}

/**
 * Point a Supavisor connection string at the port this host needs.
 *
 * `PG_POOLER_PORT=as-given` opts out, for the case this reasoning does not
 * cover — an install that has deliberately chosen the other mode, or a future
 * where Supabase changes the ports underneath us. Being overridable is what
 * makes rewriting somebody's configuration acceptable rather than presumptuous.
 */
export function resolvePoolerUrl(
  url: string | undefined,
  { isServerless, override }: { isServerless: boolean; override?: string },
): PoolerResolution {
  const value = url?.trim() ?? ''
  if (!value || override === 'as-given' || !value.includes(POOLER_HOST)) return { url: value }

  const wanted = isServerless ? TRANSACTION_PORT : SESSION_PORT
  const found = new RegExp(`${POOLER_HOST.replaceAll('.', '\\.')}:(\\d+)`).exec(value)?.[1]

  // An unrecognised port is somebody's deliberate choice, not one of the two
  // this module knows how to reason about, so it is left alone.
  if (!found || found === wanted) return { url: value }
  if (found !== SESSION_PORT && found !== TRANSACTION_PORT) return { url: value }

  return {
    url: value.replace(`${POOLER_HOST}:${found}`, `${POOLER_HOST}:${wanted}`),
    adjusted: { from: found, to: wanted },
  }
}
