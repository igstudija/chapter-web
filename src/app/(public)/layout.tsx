import React from 'react'
import '../(frontend)/styles.css'

/**
 * Root layout for token-gated, brand-free pages.
 *
 * Deliberately separate from the (frontend) group: that layout always renders the
 * organisation header, footer and chat widget on tenant hosts, with no way to opt
 * out of it from a child page. This group has its own <html>/<body> — no logo,
 * no navigation, no chapter branding.
 */

// Neutral list glyph, inlined so the page does not fall back to the organisation's favicon.
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23404040'/%3E%3Cg fill='%23fff'%3E%3Ccircle cx='10' cy='11' r='1.8'/%3E%3Crect x='14' y='9.5' width='9' height='3' rx='1.5'/%3E%3Ccircle cx='10' cy='16' r='1.8'/%3E%3Crect x='14' y='14.5' width='9' height='3' rx='1.5'/%3E%3Ccircle cx='10' cy='21' r='1.8'/%3E%3Crect x='14' y='19.5' width='9' height='3' rx='1.5'/%3E%3C/g%3E%3C/svg%3E"

export const metadata = {
  title: 'Specifiskie prasījumi',
  icons: {
    icon: [{ url: FAVICON, type: 'image/svg+xml' }],
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lv">
      <body className="flex min-h-screen flex-col bg-neutral-100 text-neutral-800 antialiased">
        <div className="flex-1">{children}</div>
        <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-500">
          Izstrādā un uztur{' '}
          <a
            href="https://codars.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
          >
            Codars Design
          </a>
        </footer>
      </body>
    </html>
  )
}
