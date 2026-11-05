/**
 * Addresses printed on a public page are harvested by bots that read the
 * HTML. Encoding them on the server and assembling the mailto link in the
 * browser after hydration keeps them out of the markup and the RSC payload
 * while leaving them one click away for a person.
 *
 * Not encryption — anything running the page's JavaScript can read them.
 * It only has to beat a regex over the HTML, which is what spam lists come from.
 */

const reverse = (s: string) => [...s].reverse().join('')

/** Server side: `name@example.com` -> opaque string, or '' for no address. */
export function encodeEmail(email: string | null | undefined): string {
  const value = email?.trim()
  if (!value) return ''
  return reverse(Buffer.from(value, 'utf8').toString('base64'))
}

/** Browser side: the inverse of encodeEmail. */
export function decodeEmail(encoded: string | null | undefined): string {
  if (!encoded) return ''
  try {
    const bytes = Uint8Array.from(atob(reverse(encoded)), (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return ''
  }
}
