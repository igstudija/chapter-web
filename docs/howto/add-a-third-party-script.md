# Add a third-party script under the CSP

Public pages send a `Content-Security-Policy` that lets a script run only if it
carries this request's **nonce**, or was loaded by a script that does
(`'strict-dynamic'`). That is what stops markup injected through rich text from
running, and it is also why a snippet pasted from a vendor — a chat widget, a
booking embed, a tracking pixel — silently does nothing. The browser console
says so: *Refused to execute inline script because it violates the following
Content Security Policy directive…*

The admin panel (`/admin`) and the API are not covered by the policy.

## Give the script the nonce

The proxy creates the nonce and hands it to the page as the `x-nonce` request
header. In a server component — the frontend layout is the usual place:

```tsx
import { headers } from 'next/headers'
import Script from 'next/script'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <>
      {children}
      <Script src="https://widget.example.com/loader.js" nonce={nonce} strategy="afterInteractive" />
      <Script id="widget-init" nonce={nonce} strategy="afterInteractive">
        {`window.Widget && window.Widget.init({ site: 'abc' })`}
      </Script>
    </>
  )
}
```

[`src/components/Analytics.tsx`](../../src/components/Analytics.tsx) is a worked
example: Google Analytics, Tag Manager and the Facebook Pixel, each given the
nonce by [`src/app/(frontend)/layout.tsx`](<../../src/app/(frontend)/layout.tsx>).

Whatever that script then loads is allowed through `'strict-dynamic'`, so a
loader pulling in its own bundles needs nothing further.

## Things the nonce does not cover

- **`onclick="…"` and other inline handlers** in pasted HTML never run. Attach
  the handler from the script instead.
- **`javascript:` links** do not run.
- **A widget that injects `<script>` tags as HTML strings** (rather than with
  `document.createElement('script')`) is blocked. Ask the vendor for a loader.

## Changing the policy itself

The policy is one function, `contentSecurityPolicy()` in
[`src/lib/csp.ts`](../../src/lib/csp.ts). Images, media, frames and network
requests already allow any `https:` origin, so embedding a YouTube video or a
map needs no change. Loosen `script-src` only as a last resort: `'unsafe-inline'`
is ignored while a nonce is present, and anything wider gives back the
protection the policy exists for.

In development the policy also allows `'unsafe-eval'` and `ws:`, which hot
reload needs, and leaves out `upgrade-insecure-requests`, which would break
plain-http `localhost`.
