import { decodeConnectionKey } from './connectionKey'
import type { ExchangeRequest, ExchangeRequester, ExchangeResponse } from './exchangeResponse'

/**
 * Reading one linked chapter.
 *
 * The far end is someone else's install: a different version, a fork, a host
 * that is down, or a chapter that revoked us this morning without saying so.
 * Every one of those ends as null. An unreachable partner is dropped from the
 * members list in silence (ADR 0007), and silence starts here.
 */

export const EXCHANGE_PATH = '/api/special-request-exchange/v1'

/** How long a partner has to answer before we go on without them. */
const DEFAULT_TIMEOUT_MS = 5000

export interface ReadableConnection {
  name: string
  /** Their key, or null for a partner we share with but do not read. */
  theirKey?: string | null
}

export interface FetchPartnerOptions {
  fetch?: typeof fetch
  timeoutMs?: number
}

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null

/**
 * Read one row defensively.
 *
 * Fields we do not know are ignored and fields we expect but do not find read
 * as empty, so a partner on a different version stays readable rather than
 * taking the whole response down with it.
 */
const readRequest = (value: unknown): ExchangeRequest | null => {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>

  const request = asString(row.request)
  const id = asString(row.id) ?? (typeof row.id === 'number' ? String(row.id) : null)
  if (!request || !id) return null

  const source = (
    typeof row.requester === 'object' && row.requester !== null ? row.requester : {}
  ) as Record<string, unknown>

  const requester: ExchangeRequester = {
    id: asString(source.id) ?? (typeof source.id === 'number' ? String(source.id) : ''),
    name: asString(source.name),
    surname: asString(source.surname),
    email: asString(source.email),
    company: asString(source.company),
    phone: asString(source.phone),
    photoUrl: asString(source.photoUrl),
    logoUrl: asString(source.logoUrl),
  }

  return {
    id,
    request,
    registrationNumber: asString(row.registrationNumber),
    createdAt: asString(row.createdAt) ?? '',
    updatedAt: asString(row.updatedAt) ?? asString(row.createdAt) ?? '',
    requester,
  }
}

/**
 * What one partner is offering, or null if we could not get it.
 *
 * Never throws and never rejects: the caller is rendering a page for members
 * who have nothing to do with the other chapter's uptime.
 */
export const fetchPartner = async (
  connection: ReadableConnection,
  { fetch: doFetch = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }: FetchPartnerOptions = {},
): Promise<ExchangeResponse | null> => {
  if (!connection.theirKey) return null

  const key = decodeConnectionKey(connection.theirKey)
  if (!key) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await doFetch(`${key.origin}${EXCHANGE_PATH}`, {
      headers: { Authorization: `Bearer ${key.secret}` },
      signal: controller.signal,
    })

    if (!response.ok) return null

    const parsed: unknown = await response.json()
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null

    const body = parsed as Record<string, unknown>
    if (!Array.isArray(body.requests)) return null

    return {
      version: typeof body.version === 'number' ? body.version : 0,
      // Our own name for them wins over whatever they call themselves, so a
      // partner cannot relabel itself inside our list.
      chapter: { name: connection.name },
      requests: body.requests.map(readRequest).filter((row): row is ExchangeRequest => row !== null),
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
