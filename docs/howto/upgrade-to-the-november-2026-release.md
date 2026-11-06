# Upgrade to the November 2026 release

Moves an install from Next.js 15 / Payload 3.69 to **Next.js 16.4 / Payload
3.93**, closes several security holes, and adds the MCP server. Plan on half an
hour, most of it the deploy.

## Do these in order

```bash
git pull                        # or merge the release into your fork
pnpm install

pnpm payload migrate:status     # what production has not had yet
pnpm migrate                    # four new migrations, all additive
pnpm secure:db --check          # one of them adds a table

pnpm secure:passwords           # accounts the old default password still opens
pnpm secure:passwords --apply   # close them — see below
```

…then deploy. Migrating first is safe — the migrations only add — and it has to
come first: the new build reads columns the old schema does not have, and
answers 500 on sign-in and on media until they exist.

If `pnpm migrate` stops to ask whether to reset the database, answer nothing and
read [Recover from a dev push](recover-from-a-dev-push.md). If you can only reach
the database from the host, see
[Run migrations in production](run-migrations-in-production.md#from-the-hosts-build-step).

### The migrations

| Migration | Adds |
| --- | --- |
| `20261105_000000_payload_3_93_columns` | `users.reset_password_requested_at`, `media._objectkey` — columns Payload 3.93 reads |
| `20261105_010000_homepage_meeting_note` | `homepage_settings.hero_meeting_note` |
| `20261106_000000_member_display_name` | `members.display_name`, filled for existing members |
| `20261106_010000_mcp_api_keys` | the `payload_mcp_api_keys` table |

## Security fixes — what they mean for you

**Accounts created with "Create New User" had a published password.** Adding a
member that way gave the new account `ChangeMe123!`, and that string is in the
public source. Members sign in by magic link, so most never changed it.
`pnpm secure:passwords` lists the accounts it still opens — by checking the
stored hash, so nobody gets locked out — and `--apply` gives each a random
password nobody knows. Those members carry on signing in by magic link, or set a
password through "forgot password". New accounts get a random password from the
start.

**Sign-in tokens were readable.** Magic-link, password-reset and email-change
tokens were returned with the user record — on the public Contacts page's data
and through `/api/users` to any signed-in member — which was enough to sign in
as someone else. They are now hidden fields. Custom code that reads them needs
`showHiddenFields: true`.

**The wiki was readable through the API without signing in**, though `/wiki`
redirected to the login page. Both now require an active member.

**Contact-form messages could be created through the REST API**, skipping the
form's spam checks. That is now administrators only; the form posts to
`/api/contact`, which adds a hidden honeypot field, a minimum fill time and
per-address and global rate limits.

**`/api/health` gave anyone the uptime, memory and database state.** It now
answers `{"status":"ok"}` with a 200 or 503. Set `HEALTH_TOKEN` and send it as
`x-health-token` to get the details back.

## Things that may need your attention

- **`src/middleware.ts` is now `src/proxy.ts`** (Next.js 16 renamed it). Move
  any changes you made there.
- **Public pages send a Content-Security-Policy** with a per-request nonce. An
  inline `<script>` you added yourself will be blocked until it carries the
  nonce — see [Add a third-party script](add-a-third-party-script.md). The admin
  panel is not affected.
- **HSTS now covers subdomains** for two years. If any subdomain of your domain
  is still served over plain HTTP, browsers that visit the site will refuse it.
- **`pnpm lint` runs `eslint .`** — `next lint` no longer exists. The React
  Compiler rules report as warnings.
- **Member pickers show people.** The member record's title is now *Name
  Surname (Company)* instead of the company, everywhere in the admin.

## New, and optional

| What | Where |
| --- | --- |
| MCP server for Claude and other assistants | [Connect Claude with MCP](connect-claude-with-mcp.md) |
| Guest link `/viesis` (Latvian sites) and `/guest` (others): always the next public meeting's registration form | Home page and header buttons use it; print it as a QR code |
| Next meeting on the home page, and a *meeting note* field in Homepage → Hero | Admin panel |
| `/.well-known/security.txt` | Set `SECURITY_CONTACT` to put your own contact first |
| `/llms.txt` — a plain-text summary for AI search | Nothing to do |
| Organization and Event structured data, `og:site_name`, `og:locale` | [Launch checklist](launch-checklist-search-and-sharing.md) |
| Week-long cache headers on uploaded media | [Set cache headers on existing media](set-media-cache-headers.md), once |

## Check it afterwards

- `https://your-domain.org/api/health` → `{"status":"ok"}`.
- Sign in to `/admin`, open **Settings → Slideshow**, and click *Skip Members* —
  members are listed by name.
- The home page's main button leads to the next event's registration form.
- `https://your-domain.org/.well-known/security.txt` answers.
- `pnpm payload migrate:status` — every row `Yes`.
