/**
 * Icons chosen in the CMS by their Iconify name (`solar:calendar-bold-duotone`)
 * are served from this site's own /icons route rather than fetched by the
 * browser from api.iconify.design.
 *
 * The browser used to request `https://api.iconify.design/solar:calendar-bold-duotone.svg`.
 * Iconify's URL form is `<prefix>/<name>.svg`; the colon form answers 404, which
 * left every stat card on the home page with a blank square where its icon
 * should be. Serving them same-origin also keeps a third party out of every
 * page view and out of the Content-Security-Policy.
 */

const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** `{ prefix, name }` from `prefix:name` or `prefix/name`, or null if malformed. */
export function parseIconName(icon: string | null | undefined): { prefix: string; name: string } | null {
  const raw = icon?.trim().toLowerCase().replace(/\.svg$/, '')
  if (!raw) return null
  const parts = raw.split(/[:/]/)
  if (parts.length !== 2) return null
  const [prefix, name] = parts
  if (!SEGMENT.test(prefix) || !SEGMENT.test(name)) return null
  return { prefix, name }
}

/** Same-origin URL for an Iconify icon, falling back to `fallback` when `icon` is unusable. */
export function iconPath(icon: string | null | undefined, fallback: string): string {
  const parsed = parseIconName(icon) ?? parseIconName(fallback)
  if (!parsed) return ''
  return `/icons/${parsed.prefix}/${parsed.name}.svg`
}
