'use client'

import { useEffect } from 'react'

const STALE_DEPLOYMENT_PATTERN =
  /older or newer deployment|Failed to find Server Action|Loading chunk \d+ failed|ChunkLoadError|Cannot read properties of undefined \(reading 'call'\)|Loading CSS chunk \d+ failed/i
const NO_RELOAD_PATHS = ['/slides', '/presentation']

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isStaleDeployment = STALE_DEPLOYMENT_PATTERN.test(error.message || error.digest || '')
  const isNoReloadPage = NO_RELOAD_PATHS.some((p) => globalThis.location?.pathname?.includes(p))
  const hasReloadedKey = 'app_stale_reload_attempted'

  useEffect(() => {
    // Auto-reload for stale deployment errors (but never on slideshow/presentation)
    // Guard against infinite reload loops using sessionStorage
    if (isStaleDeployment && !isNoReloadPage) {
      const alreadyReloaded = globalThis.sessionStorage?.getItem(hasReloadedKey)
      if (!alreadyReloaded) {
        globalThis.sessionStorage?.setItem(hasReloadedKey, String(Date.now()))
        globalThis.location.reload()
        return
      }
    }

    // Log to server via API
    fetch('/api/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        url: globalThis.location.href,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {
      // Logging failed — nothing we can do client-side
    })
  }, [error, isStaleDeployment, isNoReloadPage])

  if (
    isStaleDeployment &&
    !isNoReloadPage &&
    !globalThis.sessionStorage?.getItem(hasReloadedKey)
  ) {
    return (
      <html lang="lv">
        <body>
          <div
            style={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'system-ui, sans-serif',
              backgroundColor: '#f9fafb',
            }}
          >
            <p style={{ color: '#6b7280' }}>Tiek atjaunināta lapa...</p>
          </div>
        </body>
      </html>
    )
  }

  return (
    <html lang="lv">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            backgroundColor: '#f9fafb',
            padding: '1rem',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>!</div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '0.5rem',
              }}
            >
              Kaut kas nogāja greizi
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Radās neparedzēta kļūda. Lūdzu, mēģiniet vēlreiz.
            </p>
            {error.digest && (
              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  marginBottom: '1rem',
                  fontFamily: 'monospace',
                }}
              >
                Kļūdas kods: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                backgroundColor: '#cc0000',
                color: 'white',
                padding: '0.75rem 2rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
              }}
            >
              Mēģināt vēlreiz
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
