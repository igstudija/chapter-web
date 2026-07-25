'use client'

import { createContext, useContext, ReactNode } from 'react'
import type lv from '@/messages/lv.json'

type Messages = typeof lv

type TranslationsContextType = {
  t: <K1 extends keyof Messages, K2 extends keyof Messages[K1]>(
    namespace: K1,
    key: K2,
  ) => string
  messages: Messages
}

const TranslationsContext = createContext<TranslationsContextType | null>(null)

export function TranslationsProvider({
  children,
  messages,
}: {
  children: ReactNode
  messages: Messages
}) {
  const t = <K1 extends keyof Messages, K2 extends keyof Messages[K1]>(
    namespace: K1,
    key: K2,
  ): string => {
    const ns = messages[namespace]
    if (ns && typeof ns === 'object' && key in ns) {
      return (ns as Record<string, string>)[key as string]
    }
    return `${String(namespace)}.${String(key)}`
  }

  return (
    <TranslationsContext.Provider value={{ t, messages }}>
      {children}
    </TranslationsContext.Provider>
  )
}

export function useTranslations() {
  const context = useContext(TranslationsContext)
  if (!context) {
    throw new Error('useTranslations must be used within a TranslationsProvider')
  }
  return context
}
