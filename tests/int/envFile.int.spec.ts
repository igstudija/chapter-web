import { describe, expect, it } from 'vitest'
import { parse } from 'dotenv'
import { renderEnvFile } from '@/lib/setupWizard/envFile'

/**
 * The wizard's output has to survive being read back.
 *
 * Every value here was pasted out of somebody's dashboard, and dashboards hand
 * out passwords with `#` and keys with `=` in them. A line written without
 * thinking about that parses as something shorter, and the failure arrives much
 * later wearing a different face — "the server rejected the credentials".
 *
 * dotenv does the reading here rather than a hand-written parser, because
 * dotenv is what actually reads the file at runtime.
 */
const roundTrip = (answers: Record<string, string>) => parse(renderEnvFile(answers))

describe('renderEnvFile', () => {
  it('writes settings a dotenv reader gets back unchanged', () => {
    const answers = {
      PAYLOAD_SECRET: 'a-secret',
      POSTGRESS_DATABASE_URL: 'postgresql://postgres:pw@localhost:5432/chapteros',
      NEXT_PUBLIC_SERVER_URL: 'http://localhost:3050',
    }

    expect(roundTrip(answers)).toMatchObject(answers)
  })

  it.each([
    ['a hash, which starts a comment', 'pa#ssword'],
    ['a space', 'pass word'],
    ['a double quote', 'pass"word'],
    ['a single quote', "pass'word"],
    ['an equals sign', 'pass=word'],
    ['a backslash', 'pass\\word'],
    ['a dollar sign', 'pass$word'],
    ['a newline', 'pass\nword'],
    ['leading and trailing spaces', '  padded  '],
  ])('survives a value containing %s', (_case, value) => {
    expect(roundTrip({ PAYLOAD_SECRET: value }).PAYLOAD_SECRET).toBe(value)
  })

  // preflight treats an empty string as absent, so an unanswered setting is
  // better left out than written blank — a file full of `SMTP_HOST=` reads as
  // configured-but-broken rather than as not configured.
  it('leaves out what was not answered', () => {
    const rendered = renderEnvFile({ PAYLOAD_SECRET: 'x', SMTP_HOST: '', SMTP_USER: undefined as never })

    expect(rendered).not.toContain('SMTP_HOST')
    expect(rendered).not.toContain('SMTP_USER')
  })

  it('explains itself to whoever opens the file later', () => {
    const rendered = renderEnvFile({ PAYLOAD_SECRET: 'x' })

    expect(rendered).toContain('pnpm wizard')
  })
})
