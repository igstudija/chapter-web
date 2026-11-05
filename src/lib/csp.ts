/**
 * Content-Security-Policy for the public site.
 *
 * Scripts run only with this request's nonce or when loaded by a script that
 * has it ('strict-dynamic'); Next.js reads the nonce from the request's CSP
 * header and stamps it on its own scripts, and the layout passes it to the two
 * inline ones of ours. That is the second line of defence the audit asked for:
 * markup injected through CMS rich text cannot run script. Everything else is
 * deliberately permissive — images, frames and media from any https origin —
 * because editors embed those in rich text and blocking them would break
 * content without protecting anything.
 *
 * /admin is left out: Payload's admin loads its editors in ways this policy
 * would have to be loosened for, and it is not where visitors' content renders.
 */
export function contentSecurityPolicy(nonce: string, dev = false, https = true): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:" + (dev ? ' ws:' : ''),
    "media-src 'self' blob: https:",
    "frame-src 'self' https:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    // Only over HTTPS: on plain-http localhost it would rewrite the page's own
    // requests to https://localhost, which has nothing listening.
    ...(https && !dev ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}
