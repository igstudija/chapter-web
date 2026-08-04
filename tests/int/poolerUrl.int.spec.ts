import { describe, expect, it } from 'vitest'
import { resolvePoolerUrl } from '@/lib/poolerUrl'

const session = 'postgresql://postgres.abc:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
const transaction = 'postgresql://postgres.abc:pw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'

describe('resolvePoolerUrl', () => {
  it('sends a serverless host to the transaction pooler', () => {
    // The outage this exists to prevent: session mode gives every instance a
    // connection for its whole life, so the pool empties under load.
    const result = resolvePoolerUrl(session, { isServerless: true })

    expect(result.url).toBe(transaction)
    expect(result.adjusted).toEqual({ from: '5432', to: '6543' })
  })

  it('sends a long-running host to the session pooler', () => {
    // The mirror mistake, made by copying the value that works in production:
    // migrations need a session that outlives a single statement.
    const result = resolvePoolerUrl(transaction, { isServerless: false })

    expect(result.url).toBe(session)
    expect(result.adjusted).toEqual({ from: '6543', to: '5432' })
  })

  it('leaves a string that already matches its host alone', () => {
    expect(resolvePoolerUrl(transaction, { isServerless: true })).toEqual({ url: transaction })
    expect(resolvePoolerUrl(session, { isServerless: false })).toEqual({ url: session })
  })

  it('does not touch a Postgres that is not behind Supavisor', () => {
    // Docker, a managed instance, a colleague's laptop: 5432 is the Postgres
    // default there and none of this reasoning applies. Rewriting it would
    // point the app at a port with nothing listening on it.
    const direct = 'postgresql://postgres:pw@db.internal:5432/chapteros'

    expect(resolvePoolerUrl(direct, { isServerless: true })).toEqual({ url: direct })
  })

  it('obeys PG_POOLER_PORT=as-given', () => {
    // Rewriting somebody's configuration is only acceptable if they can stop it.
    expect(resolvePoolerUrl(session, { isServerless: true, override: 'as-given' })).toEqual({
      url: session,
    })
  })

  it('leaves a port it does not recognise as somebody a deliberate choice', () => {
    const odd = 'postgresql://postgres.abc:pw@aws-0-eu-west-1.pooler.supabase.com:7000/postgres'

    expect(resolvePoolerUrl(odd, { isServerless: true })).toEqual({ url: odd })
  })

  it('survives an absent or empty value', () => {
    // The missing-setting case belongs to configCheck; this must not throw on
    // the way there.
    expect(resolvePoolerUrl(undefined, { isServerless: true })).toEqual({ url: '' })
    expect(resolvePoolerUrl('   ', { isServerless: false })).toEqual({ url: '' })
  })
})
