import en from '@/messages/en.json'
import lv from '@/messages/lv.json'

export type Locale = 'lv' | 'en'

/**
 * Key structure is derived from English, making `en.json` the reference
 * translation: TypeScript then points at every key another locale is missing.
 */
export type Messages = typeof en

/**
 * Locale used when an organisation has not chosen one.
 *
 * English, so a fresh install is readable to whoever just cloned it. Each
 * organisation overrides this via `Sites.locale`; nothing here forces a
 * language on a configured site.
 *
 * To add a language: drop `<code>.json` next to `en.json` with the same key
 * structure, add the code to `Locale`, and register it in `messages` below.
 */
export const DEFAULT_LOCALE: Locale = 'en'

const messages: Record<Locale, Messages> = {
  en,
  lv,
}

export function getMessages(locale: Locale): Messages {
  return messages[locale]
}

// Note: getLocale() was removed as it relied on globals which are now site-scoped collections.
// Use getSiteSettings() from '@/lib/getSiteSettings' to get locale for the current site.

export function getTranslations(locale: Locale) {
  const m = messages[locale]

  return function t<K1 extends keyof Messages, K2 extends keyof Messages[K1]>(
    namespace: K1,
    key: K2,
  ): string {
    const ns = m[namespace]
    if (ns && typeof ns === 'object' && key in ns) {
      return (ns as Record<string, string>)[key as string]
    }
    return `${String(namespace)}.${String(key)}`
  }
}

export type TranslationFunction = ReturnType<typeof getTranslations>
