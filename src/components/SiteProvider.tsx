'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { DEFAULT_ORG_NAME } from '../lib/branding'

interface SiteContextValue {
  siteId: string | null
  siteName: string
  siteSlug: string | null
}

const SiteContext = createContext<SiteContextValue>({
  siteId: null,
  siteName: DEFAULT_ORG_NAME,
  siteSlug: null,
})

export function useSite() {
  return useContext(SiteContext)
}

interface SiteProviderProps {
  children: ReactNode
  siteId: string | null
  siteName: string
  siteSlug: string | null
}

export function SiteProvider({ children, siteId, siteName, siteSlug }: SiteProviderProps) {
  return (
    <SiteContext.Provider value={{ siteId, siteName, siteSlug }}>{children}</SiteContext.Provider>
  )
}
