/**
 * The slideshow is gated on the *browser*, never on the device.
 *
 * Safari can't render the slides (the deck lives inside an SVG
 * `<foreignObject>`, which WebKit lays out wrong), so Safari gets an
 * explanatory screen. Every other browser is fine — including on a phone or
 * tablet, where a naive "does the UA say Safari?" test used to lock out iOS
 * Chrome, Firefox and Edge, all of which put `Safari` in their UA string.
 */

/**
 * Tokens that appear in the UA of a browser that merely *mentions* Safari.
 * The `…iOS` entries are the iOS builds of other browsers; the rest are
 * desktop and Android engines that inherited Safari from the WebKit lineage.
 */
const NOT_SAFARI_MARKERS = [
  'CriOS', // Chrome on iOS
  'FxiOS', // Firefox on iOS
  'EdgiOS', // Edge on iOS
  'OPiOS', // Opera on iOS
  'OPT/', // Opera Touch
  'DuckDuckGo',
  'Chrome',
  'Chromium',
  'Firefox',
  'Android',
  'SamsungBrowser',
  'YaBrowser',
  'OPR/',
  'Edg/',
]

/**
 * True only for real Safari (macOS or iOS/iPadOS).
 *
 * Pass a UA string to test without a browser; defaults to the current one and
 * returns `false` during SSR so the server never renders the warning screen.
 */
export function isSafariBrowser(userAgent?: string): boolean {
  const ua = userAgent ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent)
  if (!ua || !ua.includes('Safari')) return false
  return !NOT_SAFARI_MARKERS.some((marker) => ua.includes(marker))
}
