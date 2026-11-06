/**
 * Passwords that no account may sign in with or be given, because they are
 * known to everyone who can read this repository.
 *
 * `ChangeMe123!` is what "Create New User" in the admin gave every new account
 * until November 2026. It was in the public source while password sign-in was
 * enabled, so it opened every account whose owner never changed it — most of
 * them, because members sign in by magic link.
 *
 * Three things use this list:
 * - sign-in refuses these passwords outright, and the login page explains why
 *   and offers a reset — the same answer whether or not the address has an
 *   account, so it tells nobody which addresses do;
 * - Users refuses to store one as a new password;
 * - `pnpm secure:passwords` finds the accounts still using one and replaces it.
 */
export const RETIRED_PASSWORDS: readonly string[] = ['ChangeMe123!']

export function isRetiredPassword(password: unknown): boolean {
  return typeof password === 'string' && RETIRED_PASSWORDS.includes(password)
}

/** Error code the login API answers with, for the page to show the notice. */
export const RETIRED_PASSWORD_CODE = 'retired_password'
