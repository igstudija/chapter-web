/**
 * Writing a `.env` that reads back as what was typed.
 *
 * Every value in it was pasted out of a dashboard, and dashboards hand out
 * passwords containing `#`, keys containing `=`, and the occasional quote. An
 * unquoted line carrying any of those parses as something shorter, and the
 * failure surfaces much later as "the server rejected the credentials".
 *
 * Quoting is chosen against what dotenv actually does when it reads the file
 * back, which is not the same as what a shell would do.
 */

/** The order settings appear in, grouped the way `.env.example` groups them. */
const LAYOUT: Array<{ heading: string; settings: string[] }> = [
  {
    heading: 'Required — preflight stops the app when either of these is missing',
    settings: ['PAYLOAD_SECRET', 'POSTGRESS_DATABASE_URL'],
  },
  {
    heading: 'Where this install is reached, used in emails and absolute links',
    settings: ['NEXT_PUBLIC_SERVER_URL'],
  },
  {
    heading: 'File storage',
    settings: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_STORAGE_BUCKET'],
  },
  {
    heading: 'Email — without it, nobody can be invited and no password can be reset',
    settings: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM', 'EMAIL_FROM_NAME'],
  },
  {
    heading: 'Database pool — lower on serverless, where every instance holds its own',
    settings: ['PG_POOL_MAX'],
  },
]

const NEEDS_QUOTING = /[\s#="'`$\\]|^$/

/**
 * Wrap a value so dotenv returns it verbatim.
 *
 * dotenv strips one layer of matching quotes and, for double quotes only,
 * turns `\n` and `\r` into real characters. It never unescapes `\"` or `\'`, so
 * a quote character cannot be escaped inside its own quote style — the answer
 * is to pick a quote style the value does not contain.
 */
const quote = (value: string): string => {
  if (!NEEDS_QUOTING.test(value)) return value

  const hasNewline = /[\n\r]/.test(value)

  if (!hasNewline) {
    if (!value.includes("'")) return `'${value}'`
    if (!value.includes('`')) return `\`${value}\``
    if (!value.includes('"')) return `"${value}"`
    throw new Error('A value containing all three quote characters cannot be written to .env.')
  }

  // Only double quotes bring newlines back. A value carrying both a newline and
  // a double quote has no representation dotenv reads correctly, and writing
  // one anyway would be a silent corruption.
  if (value.includes('"')) {
    throw new Error('A value containing both a newline and a double quote cannot be written to .env.')
  }

  return `"${value.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`
}

/**
 * Render the file.
 *
 * Settings with no answer are left out rather than written empty: preflight
 * reads an empty string as absent, so a file full of `SMTP_HOST=` would say
 * "configured, and broken" where the truth is "not configured".
 */
export const renderEnvFile = (answers: Record<string, string | undefined>): string => {
  const answered = (name: string) => {
    const value = answers[name]
    return typeof value === 'string' && value.length > 0 ? value : null
  }

  const lines: string[] = [
    '# Written by `pnpm wizard`. Edit it by hand or run the wizard again —',
    '# it reads what is already here and offers each value back as the default.',
    '#',
    '# Never commit this file. It is in .gitignore, and should stay there.',
  ]

  for (const { heading, settings } of LAYOUT) {
    const present = settings.filter((name) => answered(name))
    if (present.length === 0) continue

    lines.push('', `# ${heading}`)
    for (const name of present) lines.push(`${name}=${quote(answered(name)!)}`)
  }

  // Anything the layout does not know about still belongs in the file — an
  // install that has been customised must not lose settings by being rewritten.
  const known = new Set(LAYOUT.flatMap((group) => group.settings))
  const extra = Object.keys(answers).filter((name) => !known.has(name) && answered(name))

  if (extra.length > 0) {
    lines.push('', '# Everything else this install carries')
    for (const name of extra) lines.push(`${name}=${quote(answered(name)!)}`)
  }

  return lines.join('\n') + '\n'
}
