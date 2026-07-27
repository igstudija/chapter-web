/**
 * Product and default-organisation naming.
 *
 * Every user-visible name that is NOT stored per-organisation resolves through
 * this module, so a fork can rebrand an entire install by editing this file (or
 * setting the env vars) instead of grepping the codebase for strings.
 *
 * Anything that *is* per-organisation — display name, logo, brand colour —
 * lives on the `Sites` collection and on `SiteSettings`; the constants here are
 * only the fallbacks used before an organisation has filled those in.
 */

/** Name of the software itself. Shown in the admin panel. */
export const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME?.trim() || 'ChapterOS'

/** Fallback display name for an organisation that has not set its own. */
export const DEFAULT_ORG_NAME =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME?.trim() || 'Your Organisation'

/** Suffix appended to admin panel page titles, e.g. `Members | ChapterOS`. */
export const ADMIN_TITLE_SUFFIX = ` | ${PRODUCT_NAME}`


/**
 * Word used for a single tenant throughout the UI.
 *
 * Networking organisations call their local groups different things —
 * "chapter", "club", "branch", "lodge". This is the noun used in generic copy
 * that isn't covered by a translation key.
 */
export const ORG_UNIT_NOUN = process.env.NEXT_PUBLIC_ORG_UNIT_NOUN?.trim() || 'chapter'

/**
 * Initials badge for an organisation with no logo uploaded.
 *
 * Takes the first letter of up to two words, so "Riga Business Club" → "RB"
 * and "Harbour" → "H". Returns a single bullet rather than an empty string so
 * the badge never collapses to zero width in the header.
 */
export const orgInitials = (name?: string | null): string => {
  const words = (name || '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '•'
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

/**
 * Short label for an organisation, used on compact badges where the full name
 * would wrap — e.g. the per-row chips on the cross-organisation shared
 * requests page.
 *
 * Prefers the explicit `shortName` field; falls back to the full name. Sites
 * whose names share a common prefix ("Acme Riga", "Acme Tallinn") should set
 * `shortName` rather than relying on string surgery here.
 */
export const orgShortName = (site?: { name?: string | null; shortName?: string | null } | null): string => {
  return site?.shortName?.trim() || site?.name?.trim() || DEFAULT_ORG_NAME
}
