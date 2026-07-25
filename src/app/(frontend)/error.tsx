'use client'

import { useEffect } from 'react'

const STALE_DEPLOYMENT_PATTERN =
  /older or newer deployment|Failed to find Server Action|Loading chunk \d+ failed|ChunkLoadError|Cannot read properties of undefined \(reading 'call'\)|Loading CSS chunk \d+ failed/i
const NO_RELOAD_PATHS = ['/slides', '/presentation']

export default function FrontendError({
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
    if (isStaleDeployment && !isNoReloadPage) {
      const alreadyReloaded = globalThis.sessionStorage?.getItem(hasReloadedKey)
      if (!alreadyReloaded) {
        globalThis.sessionStorage?.setItem(hasReloadedKey, String(Date.now()))
        globalThis.location.reload()
        return
      }
    }

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
    }).catch(() => {})
  }, [error, isStaleDeployment, isNoReloadPage])

  if (
    isStaleDeployment &&
    !isNoReloadPage &&
    !globalThis.sessionStorage?.getItem(hasReloadedKey)
  ) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500">Tiek atjaunināta lapa...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Kaut kas nogāja greizi</h2>
        <p className="text-gray-500 mb-4">Radās neparedzēta kļūda. Lūdzu, mēģiniet vēlreiz.</p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-3 font-mono">Kļūdas kods: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="bg-[#cc0000] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#aa0000] transition-colors"
        >
          Mēģināt vēlreiz
        </button>
      </div>
    </div>
  )
}
