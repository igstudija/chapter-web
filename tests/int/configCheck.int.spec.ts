import { describe, expect, it } from 'vitest'
import { checkConfiguration, hasFatal, KNOWN_SETTINGS } from '@/lib/configCheck'

/** A configuration with nothing wrong with it. */
const complete = {
  PAYLOAD_SECRET: 'a-secret',
  POSTGRESS_DATABASE_URL: 'postgresql://postgres:pw@localhost:5432/chapteros',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  SMTP_HOST: 'smtp.example.com',
}

const without = (...settings: string[]) => {
  const values: Record<string, string | undefined> = { ...complete }
  for (const setting of settings) delete values[setting]
  return values
}

describe('checkConfiguration', () => {
  it('finds nothing wrong with a complete configuration', () => {
    expect(checkConfiguration(complete)).toEqual([])
  })

  it('treats an empty string and whitespace as absent', () => {
    // A Self-hoster who leaves `PAYLOAD_SECRET=` in place has not set it, and
    // the error they get should say so rather than describing a bad secret.
    expect(hasFatal(checkConfiguration({ ...complete, PAYLOAD_SECRET: '' }))).toBe(true)
    expect(hasFatal(checkConfiguration({ ...complete, PAYLOAD_SECRET: '   ' }))).toBe(true)
  })

  it.each(['PAYLOAD_SECRET', 'POSTGRESS_DATABASE_URL'])(
    'stops the process when %s is missing, and names it',
    (setting) => {
      const findings = checkConfiguration(without(setting))

      expect(hasFatal(findings)).toBe(true)
      expect(findings.some((f) => f.severity === 'fatal' && f.settings.includes(setting))).toBe(true)
      expect(findings.find((f) => f.settings.includes(setting))?.message).toContain(setting)
    },
  )

  it('reports every missing setting at once rather than only the first', () => {
    // The whole point of the check: a fresh .env should be fixed in one pass,
    // not one restart at a time.
    const findings = checkConfiguration({})
    const named = findings.flatMap((f) => f.settings)

    for (const setting of KNOWN_SETTINGS) {
      expect(named).toContain(setting)
    }
  })

  it('tells a malformed connection string apart from an absent one', () => {
    const absent = checkConfiguration(without('POSTGRESS_DATABASE_URL'))[0]
    const malformed = checkConfiguration({
      ...complete,
      POSTGRESS_DATABASE_URL: 'localhost:5432',
    })[0]

    expect(absent.message).toContain('is not set')
    expect(malformed.message).not.toContain('is not set')
    expect(malformed.message).toContain('postgresql://')
    expect(malformed.severity).toBe('fatal')
  })

  it('lets the app start without mail, naming what stops working', () => {
    const findings = checkConfiguration(without('SMTP_HOST'))

    expect(hasFatal(findings)).toBe(false)
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe('degraded')
    expect(findings[0].message).toContain('invitations')
    expect(findings[0].message).toContain('password resets')
  })

  it('lets the app start without storage, naming what stops working', () => {
    const findings = checkConfiguration(without('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'))

    expect(hasFatal(findings)).toBe(false)
    expect(findings).toHaveLength(1)
    expect(findings[0].message).toContain('upload')
  })

  it('reports one finding per capability, not one per setting', () => {
    // Both storage settings absent is one broken capability, and reading two
    // near-identical warnings teaches the reader to skim them.
    const findings = checkConfiguration(without('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'))

    expect(findings).toHaveLength(1)
    expect(findings[0].settings).toEqual(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
  })

  describe('pooler port against the host it runs on', () => {
    const session = 'postgresql://postgres.abc:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
    const transaction = 'postgresql://postgres.abc:pw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'

    it('warns when serverless points at the session pooler', () => {
      // The outage this exists to prevent: session mode holds a connection for
      // the life of each instance, so the pool empties under load rather than
      // at boot, and nothing before that moment looks wrong.
      const findings = checkConfiguration(
        { ...complete, POSTGRESS_DATABASE_URL: session },
        { isServerless: true },
      )

      expect(findings).toHaveLength(1)
      expect(findings[0].settings).toEqual(['POSTGRESS_DATABASE_URL'])
      expect(findings[0].message).toContain('6543')
    })

    it('warns when a long-running host points at the transaction pooler', () => {
      // The mirror mistake, made by copying the production value: migrations
      // need a session that outlives a single statement.
      const findings = checkConfiguration(
        { ...complete, POSTGRESS_DATABASE_URL: transaction },
        { isServerless: false },
      )

      expect(findings).toHaveLength(1)
      expect(findings[0].message).toContain('5432')
    })

    it('accepts each pooler on the host it belongs to', () => {
      expect(
        checkConfiguration({ ...complete, POSTGRESS_DATABASE_URL: transaction }, { isServerless: true }),
      ).toEqual([])
      expect(
        checkConfiguration({ ...complete, POSTGRESS_DATABASE_URL: session }, { isServerless: false }),
      ).toEqual([])
    })

    it('says nothing about a Postgres that is not behind Supavisor', () => {
      // Docker, a managed instance, a colleague's laptop: 5432 is just the
      // Postgres default there, and none of this reasoning applies.
      expect(
        checkConfiguration(
          { ...complete, POSTGRESS_DATABASE_URL: 'postgresql://postgres:pw@db.internal:5432/chapteros' },
          { isServerless: true },
        ),
      ).toEqual([])
    })
  })
})
