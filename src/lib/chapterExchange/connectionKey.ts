/**
 * The single string two chapters exchange to link their installs.
 *
 * It carries the origin to call, the secret to present and the chapter's own
 * name, so that adding a partner is one paste rather than three fields to
 * mistype. See ADR 0007.
 */

/** Marks the string as one of ours, so a mistyped paste fails here rather than as a fetch error. */
const PREFIX = 'chx_'

export interface ConnectionKeyContents {
  /** Scheme, host and port of the chapter this key opens. */
  origin: string
  /** The bearer secret that chapter will accept. */
  secret: string
  /** What that chapter calls itself, used to prefill the connection record. */
  name: string
}

const isLoopback = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'

/**
 * Reduce a URL to the origin a key may carry, or null if it may not carry one.
 *
 * The secret rides in an `Authorization` header, so a plaintext origin would
 * hand it to anyone on the path. Loopback is the exception, and only so that
 * two installs on one machine can be linked while developing.
 */
const normalizeOrigin = (value: string): string | null => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  if (url.protocol === 'https:') return url.origin
  if (url.protocol === 'http:' && isLoopback(url.hostname)) return url.origin
  return null
}

/**
 * Mint this chapter's key.
 *
 * Throws on an origin that must not be minted — a plaintext
 * `NEXT_PUBLIC_SERVER_URL` is a configuration error the Self-hoster has to see,
 * not a key to hand out quietly.
 */
export const encodeConnectionKey = (contents: ConnectionKeyContents): string => {
  const origin = normalizeOrigin(contents.origin)
  if (!origin) {
    throw new Error(
      `Cannot mint a connection key for "${contents.origin}": an https origin is required.`,
    )
  }

  return PREFIX + Buffer.from(JSON.stringify({ ...contents, origin }), 'utf8').toString('base64url')
}

const isFilled = (value: unknown): value is string => typeof value === 'string' && value.length > 0

/**
 * Read a key, or return null if it is not one.
 *
 * Never throws: the argument is whatever a Self-hoster pasted into a form, and
 * the caller's job is to say "that is not a connection key" rather than to
 * handle an exception.
 */
export const decodeConnectionKey = (key: string): ConnectionKeyContents | null => {
  if (!key.startsWith(PREFIX)) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(key.slice(PREFIX.length), 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null

  const { origin, secret, name } = parsed as Record<string, unknown>
  if (!isFilled(origin) || !isFilled(secret) || !isFilled(name)) return null

  const normalized = normalizeOrigin(origin)
  if (!normalized) return null

  return { origin: normalized, secret, name }
}
