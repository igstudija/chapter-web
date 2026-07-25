'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { DEFAULT_ORG_NAME } from '../lib/branding'

interface SiteContextValue {
  siteId: string | null
  siteName: string
}

const SiteContext = createContext<SiteContextValue>({
  siteId: null,
  siteName: DEFAULT_ORG_NAME,
})

export function useSite() {
  return useContext(SiteContext)
}

interface SiteProviderProps {
  children: ReactNode
  siteId: string | null
  siteName: string
}

export function SiteProvider({ children, siteId, siteName }: SiteProviderProps) {
  return (
    <SiteContext.Provider value={{ siteId, siteName }}>{children}</SiteContext.Provider>
  )
}
