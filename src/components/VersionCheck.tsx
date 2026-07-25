'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const STALE_DEPLOYMENT_PATTERN = /older or newer deployment|Failed to find Server Action/i
// Never auto-reload on these paths (slideshow, presentation — must not be interrupted)
const NO_RELOAD_PATHS = ['/slides', '/presentation']

function isNoReloadPage(): boolean {
  return NO_RELOAD_PATHS.some((p) => globalThis.location?.pathname?.includes(p))
}

export function VersionCheck() {
  const buildIdRef = useRef<string | null>(null)
  const needsReloadRef = useRef(false)
  const reloadingRef = useRef(false)
  const pathname = usePathname()

  // Force reload (deduplicated, skipped on slideshow/presentation pages)
  function forceReload() {
    if (reloadingRef.current || isNoReloadPage()) return
    reloadingRef.current = true
    globalThis.location.reload()
  }

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return

    async function checkVersion() {
      try {
        const res = await fetch('/api/build-id', { cache: 'no-store' })
        if (!res.ok) return
        const { buildId } = await res.json()

        if (buildIdRef.current === null) {
          buildIdRef.current = buildId
        } else if (buildIdRef.current !== buildId) {
          needsReloadRef.current = true
        }
      } catch {
        // Silently ignore network errors
      }
    }

    // Check once on mount to capture current build ID
    checkVersion()

    // Check when tab becomes visible (user returns to tab after being away)
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        checkVersion().then(() => {
          if (needsReloadRef.current) forceReload()
        })
      }
    }

    // Catch "Failed to find Server Action" errors instantly (zero overhead until error)
    function onError(event: ErrorEvent) {
      if (STALE_DEPLOYMENT_PATTERN.test(event.message || '')) {
        event.preventDefault()
        forceReload()
      }
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const message = event.reason?.message || event.reason?.digest || String(event.reason || '')
      if (STALE_DEPLOYMENT_PATTERN.test(message)) {
        event.preventDefault()
        forceReload()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    globalThis.addEventListener('error', onError)
    globalThis.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      globalThis.removeEventListener('error', onError)
      globalThis.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  // Reload when user navigates to a different page (if new version detected)
  const prevPathRef = useRef(pathname)
  useEffect(() => {
    if (prevPathRef.current !== pathname && needsReloadRef.current) {
      forceReload()
    }
    prevPathRef.current = pathname
  }, [pathname])

  return null
}
