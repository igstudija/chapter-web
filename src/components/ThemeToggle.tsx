'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useState, useRef, useEffect } from 'react'
import { useTranslations } from './TranslationsProvider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-5 w-5" />
      case 'dark':
        return <Moon className="h-5 w-5" />
      case 'system':
        return <Monitor className="h-5 w-5" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-300"
        aria-label={t('common', 'toggleTheme')}
      >
        {getIcon()}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-50">
          <button
            onClick={() => {
              setTheme('light')
              setIsOpen(false)
            }}
            className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ${
              theme === 'light'
                ? 'text-brand font-medium'
                : 'text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <Sun className="h-4 w-4" />
            {t('common', 'themeLight')}
          </button>
          <button
            onClick={() => {
              setTheme('dark')
              setIsOpen(false)
            }}
            className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ${
              theme === 'dark'
                ? 'text-brand font-medium'
                : 'text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <Moon className="h-4 w-4" />
            {t('common', 'themeDark')}
          </button>
          <button
            onClick={() => {
              setTheme('system')
              setIsOpen(false)
            }}
            className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ${
              theme === 'system'
                ? 'text-brand font-medium'
                : 'text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <Monitor className="h-4 w-4" />
            {t('common', 'themeSystem')}
          </button>
        </div>
      )}
    </div>
  )
}
