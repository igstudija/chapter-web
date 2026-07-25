/**
 * Optional link-out to an external member directory.
 *
 * Many networking organisations run a central directory alongside their local
 * portal, and it is useful to jump from a member here to their entry there.
 * Such directories rarely expose a stable per-member URL, so the link points at
 * a search instead, with the member's name substituted into a template.
 *
 * Configure with `DIRECTORY_SEARCH_URL`, using `{query}` where the URL-encoded
 * name should go:
 *
 *     DIRECTORY_SEARCH_URL=https://example.org/members?keywords=%22{query}%22
 *
 * Unset by default. When unset, `getDirectorySearchTemplate()` returns null and
 * callers must hide the link rather than render a dead one.
 */

export function getDirectorySearchTemplate(): string | null {
  return process.env.DIRECTORY_SEARCH_URL?.trim() || null
}

export function buildDirectorySearchUrl(
  fullName: string,
  template: string | null,
): string | null {
  if (!template) return null
  return template.replace('{query}', encodeURIComponent(fullName.trim()))
}
