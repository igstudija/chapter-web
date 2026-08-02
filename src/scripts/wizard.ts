import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import readline from 'node:readline/promises'
import { Writable } from 'node:stream'
import { stdin, stdout } from 'node:process'
import { parse } from 'dotenv'
import { PRODUCT_NAME } from '../lib/branding'
import { renderEnvFile } from '../lib/setupWizard/envFile'
import { checkDatabase, checkMail, checkStorage, type Outcome } from '../lib/infraChecks'

/**
 * The install, one question at a time.
 *
 * Everything here can be done by hand — this asks the same questions the README
 * asks, checks each answer against the thing it describes before moving on, and
 * then runs the ordered steps so the order cannot be got wrong. See ADR 0002
 * for why checking early matters and ADR 0004 for why this is not `pnpm setup`.
 *
 * **Run this yourself.** The answers are credentials. A coding agent running it
 * on your behalf would put them in its transcript, which is the one place they
 * should never be. Nothing this prints is a secret: values already on disk are
 * offered back as "kept" rather than shown, and typed secrets are not echoed.
 */

const ENV_PATH = '.env'

/**
 * Everything the interface prints goes through here, so that a secret being
 * typed can be swallowed rather than echoed. Filtering the stream is what makes
 * this work the same whether the answers come from a keyboard or a pipe —
 * reaching into readline's internals did neither.
 */
let muted = false
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) stdout.write(chunk as Buffer, encoding as BufferEncoding)
    callback()
  },
})

// `terminal` follows the input. On a real terminal readline echoes what is
// typed, which is what there is to mute; fed from a pipe it echoes nothing, and
// forcing terminal mode there makes it dump the whole buffer at the first
// question and starve every one after it.
const interactive = stdin.isTTY === true
const rl = readline.createInterface({ input: stdin, output, terminal: interactive })

const say = (line = '') => console.log(line)

const heading = (title: string) => {
  say()
  say(title)
  say('─'.repeat(title.length))
}

/** Ask, offering a default. Never used for anything secret. */
const ask = async (question: string, fallback?: string): Promise<string> => {
  const answer = (await rl.question(fallback ? `${question} [${fallback}] ` : `${question} `)).trim()
  return answer || fallback || ''
}

/**
 * Ask without echoing, and without showing what is already there.
 *
 * A secret already in `.env` is offered as "kept" — pressing enter reuses it
 * without it ever being written to the screen, which is what makes this safe to
 * run in a shared terminal or over a screen share.
 */
const askSecret = async (question: string, existing?: string): Promise<string> => {
  stdout.write(existing ? `${question} [kept] ` : `${question} `)

  muted = interactive
  try {
    const answer = (await rl.question('')).trim()
    return answer || existing || ''
  } finally {
    muted = false
    stdout.write('\n')
  }
}

const yes = async (question: string, fallback = true): Promise<boolean> => {
  const answer = (await ask(`${question} (y/n)`, fallback ? 'y' : 'n')).toLowerCase()
  return answer.startsWith('y')
}

const show = (outcome: Outcome): void => {
  say(`  ${outcome.skipped ? '–' : outcome.ok ? '✓' : '✖'} ${outcome.detail}`)
  if (outcome.fix) say(`    ${outcome.fix}`)
}

/**
 * Ask until the answer describes something that answers back.
 *
 * A wrong password caught here is one sentence. The same wrong password caught
 * three commands later is a puzzle, which is the whole argument of ADR 0002.
 */
const askUntilItWorks = async <T>(
  collect: () => Promise<T>,
  verify: (answers: T) => Promise<Outcome>,
): Promise<T> => {
  for (;;) {
    const answers = await collect()
    say('  checking…')
    const outcome = await verify(answers)
    show(outcome)

    if (outcome.ok) return answers
    if (!(await yes('  Try again?'))) return answers
  }
}

/** Run a pnpm script, letting it own the terminal. Resolves to its exit code. */
const run = (script: string[]): Promise<number> =>
  new Promise((resolve) => {
    say()
    say(`$ pnpm ${script.join(' ')}`)
    const child = spawn('pnpm', script, { stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('close', (code) => resolve(code ?? 1))
  })

async function main() {
  // Without a terminal this cannot work and must not pretend to. readline hands
  // a piped stdin over line by line as fast as it arrives, and any line no
  // question is waiting for is dropped — the second prompt would then wait for
  // input that has already been thrown away, forever, printing nothing. A
  // command that hangs silently is the failure ADR 0004 exists about.
  if (!interactive) {
    console.error('\n✖ `pnpm wizard` needs a terminal — it asks questions.\n')
    console.error('For an unattended install, set the values in .env yourself and run:')
    console.error('  pnpm migrate && pnpm secure:db --apply && pnpm bootstrap && pnpm seed:policies')
    console.error('`pnpm bootstrap` takes SETUP_ORG_NAME, SETUP_ADMIN_EMAIL and')
    console.error('SETUP_ADMIN_PASSWORD from the environment when nothing can be asked.\n')
    process.exit(1)
  }

  say()
  say(`${PRODUCT_NAME} — install`)
  say('='.repeat(PRODUCT_NAME.length + 10))
  say()
  say('This asks for what the install needs, checks each answer against the')
  say('thing it describes, writes .env, and then runs the steps in order.')
  say()
  say('Before starting, have ready:')
  say('  • a Supabase project, with a PUBLIC storage bucket (named "media")')
  say('  • its connection string, project URL and service_role key')
  say('  • SMTP details, if you want invitations and password resets to work')
  say()

  const existing = existsSync(ENV_PATH) ? parse(readFileSync(ENV_PATH, 'utf8')) : {}
  if (Object.keys(existing).length > 0) {
    say(`Found an existing ${ENV_PATH}. Its values are offered as defaults, and`)
    say('it will be backed up before anything is written.')
  }

  const answers: Record<string, string | undefined> = { ...existing }

  // --- Identity, and the two preflight refuses to start without ---------------
  heading('1. This install')

  answers.NEXT_PUBLIC_SERVER_URL = await ask(
    'Where will this site be reached?',
    existing.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3050',
  )

  if (existing.PAYLOAD_SECRET) {
    say('PAYLOAD_SECRET is already set — keeping it. Changing it logs everyone out.')
    answers.PAYLOAD_SECRET = existing.PAYLOAD_SECRET
  } else {
    answers.PAYLOAD_SECRET = randomBytes(32).toString('base64')
    say('PAYLOAD_SECRET generated. It signs session tokens — keep the file safe.')
  }

  // --- Database --------------------------------------------------------------
  heading('2. Database')
  say('Supabase → Project Settings → Database → Connection string (URI).')
  say('Use the SESSION pooler (port 5432) here; the deploy guide explains why')
  say('the deployed app uses 6543 instead.')

  const database = await askUntilItWorks(
    async () => ({
      url: await askSecret('Connection string:', existing.POSTGRESS_DATABASE_URL),
    }),
    ({ url }) => checkDatabase(url),
  )
  answers.POSTGRESS_DATABASE_URL = database.url

  const pool = await ask('Maximum database connections (5 on serverless, 50 on a server)', existing.PG_POOL_MAX || '')
  answers.PG_POOL_MAX = pool || undefined

  // --- Storage ---------------------------------------------------------------
  heading('3. File storage')
  say('Supabase → Project Settings → API. The bucket must be PUBLIC: files are')
  say('served straight from Supabase, so a private one renders every image')
  say('broken rather than protecting it.')

  const storage = await askUntilItWorks(
    async () => ({
      url: await ask('Project URL:', existing.SUPABASE_URL),
      serviceRoleKey: await askSecret(
        'service_role key (not the anon key):',
        existing.SUPABASE_SERVICE_ROLE_KEY,
      ),
      bucket: await ask('Bucket name:', existing.SUPABASE_STORAGE_BUCKET || 'media'),
    }),
    (values) => checkStorage(values),
  )
  answers.SUPABASE_URL = storage.url
  answers.SUPABASE_SERVICE_ROLE_KEY = storage.serviceRoleKey
  answers.SUPABASE_STORAGE_BUCKET = storage.bucket

  // --- Email -----------------------------------------------------------------
  heading('4. Email')
  say('Without this the site runs, and nobody can be invited and no password')
  say('can be reset. Mailjet is the worked example — see .env.example.')

  if (await yes('Set up email now?')) {
    const mail = await askUntilItWorks(
      async () => ({
        host: await ask('SMTP host:', existing.SMTP_HOST || 'in-v3.mailjet.com'),
        port: await ask('SMTP port:', existing.SMTP_PORT || '587'),
        user: await ask('SMTP user (Mailjet: the API key):', existing.SMTP_USER),
        pass: await askSecret('SMTP password (Mailjet: the secret key):', existing.SMTP_PASS),
      }),
      (values) => checkMail(values),
    )
    answers.SMTP_HOST = mail.host
    answers.SMTP_PORT = mail.port
    answers.SMTP_USER = mail.user
    answers.SMTP_PASS = mail.pass

    say()
    say('The sender address must be one your provider has verified, or mail is')
    say('accepted and then dropped without a bounce.')
    answers.EMAIL_FROM = await ask('Send mail as:', existing.EMAIL_FROM)
    answers.EMAIL_FROM_NAME = await ask('Sender name:', existing.EMAIL_FROM_NAME)
  } else {
    say('Skipped. Every start will warn about it until it is set.')
  }

  // --- Write -----------------------------------------------------------------
  heading('5. Writing .env')

  if (existsSync(ENV_PATH)) {
    const backup = `${ENV_PATH}.backup-${Date.now()}`
    renameSync(ENV_PATH, backup)
    say(`Previous file kept as ${backup}`)
  }

  writeFileSync(ENV_PATH, renderEnvFile(answers), { mode: 0o600 })
  const written = Object.keys(answers).filter((key) => answers[key]).length
  say(`Wrote ${written} settings to ${ENV_PATH}, readable only by you.`)

  // --- The ordered steps -----------------------------------------------------
  heading('6. Preparing the database')
  say('These run in this order for a reason: the schema is created, the tables')
  say('are closed to Supabase’s public API before any member data exists, and')
  say('only then is the first account made.')
  say()

  if (!(await yes('Run them now?'))) {
    say()
    say('Nothing else was changed. When you are ready:')
    say('  pnpm migrate && pnpm secure:db --apply && pnpm bootstrap && pnpm seed:policies')
    rl.close()
    return
  }

  rl.close()

  const steps: Array<{ label: string; script: string[]; optional?: boolean }> = [
    { label: 'Creating the schema', script: ['migrate'] },
    { label: 'Closing the database to the public API', script: ['secure:db', '--apply'] },
    { label: 'Creating your settings and administrator account', script: ['bootstrap'] },
    { label: 'Filling the policy pages the footer links to', script: ['seed:policies'] },
  ]

  for (const step of steps) {
    heading(step.label)
    const code = await run(step.script)
    if (code !== 0) {
      say()
      say(`✖ \`pnpm ${step.script.join(' ')}\` stopped with code ${code}.`)
      say('  Nothing after it has run. Fix what it reported and run the wizard')
      say('  again — it will offer everything above as defaults.')
      process.exit(1)
    }
  }

  heading('Done')
  say(`Start it with:  pnpm dev`)
  say(`Then open:      ${answers.NEXT_PUBLIC_SERVER_URL}/admin`)
  say()
}

void main().catch((error) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}\n`)
  rl.close()
  process.exit(1)
})
