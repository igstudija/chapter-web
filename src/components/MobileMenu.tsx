'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, X, User, Key, LogOut, Shield, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useTranslations } from './TranslationsProvider'
import { ChangePasswordModal } from './ChangePasswordModal'

interface MobileMenuProps {
  readonly navigation: readonly Readonly<{ name: string; href: string }>[]
  readonly user: Readonly<{ isAdmin?: boolean }> | null
}

export function MobileMenu({ navigation, user }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const router = useRouter()
  const { t } = useTranslations()
  const { theme, setTheme } = useTheme()

  const handleLogout = async () => {
    setIsOpen(false)
    await fetch('/api/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <div className="md:hidden">
      {/* Hamburger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-2 text-ink dark:text-surface-text"
        aria-label={t('common', 'openMenu')}
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Full Screen Overlay Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-9999 bg-white dark:bg-neutral-900">
          {/* Close Button */}
          <div className="flex justify-end p-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 text-ink dark:text-surface-text"
              aria-label={t('common', 'closeMenu')}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Menu Content */}
          <div className="px-6 pb-6 overflow-y-auto h-[calc(100vh-80px)]">
            {/* Navigation Links */}
            <nav className="space-y-2 mb-8">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="block py-3 text-lg font-medium text-ink dark:text-surface-text border-b border-neutral-200 dark:border-neutral-700"
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Theme Selection */}
            <div className="mb-8">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-3">
                {t('common', 'theme')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border ${
                    theme === 'light'
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-neutral-300 dark:border-neutral-600 text-ink dark:text-surface-text'
                  }`}
                >
                  <Sun className="h-5 w-5" />
                  <span>{t('common', 'themeLight')}</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border ${
                    theme === 'dark'
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-neutral-300 dark:border-neutral-600 text-ink dark:text-surface-text'
                  }`}
                >
                  <Moon className="h-5 w-5" />
                  <span>{t('common', 'themeDark')}</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border ${
                    theme === 'system'
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-neutral-300 dark:border-neutral-600 text-ink dark:text-surface-text'
                  }`}
                >
                  <Monitor className="h-5 w-5" />
                  <span>{t('common', 'themeSystem')}</span>
                </button>
              </div>
            </div>

            {/* User Actions */}
            <div className="space-y-2">
              {user ? (
                <>
                  <Link
                    href="/my-profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 py-3 text-lg font-medium text-ink dark:text-surface-text"
                  >
                    <User className="h-5 w-5" />
                    {t('nav', 'myProfile')}
                  </Link>
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      setShowPasswordModal(true)
                    }}
                    className="flex items-center gap-3 py-3 text-lg font-medium text-ink dark:text-surface-text w-full"
                  >
                    <Key className="h-5 w-5" />
                    {t('profile', 'changePassword')}
                  </button>
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      target="_blank"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 py-3 text-lg font-medium text-ink dark:text-surface-text"
                    >
                      <Shield className="h-5 w-5" />
                      {t('nav', 'adminPanel')}
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 py-3 text-lg font-medium text-red-600 w-full"
                  >
                    <LogOut className="h-5 w-5" />
                    {t('nav', 'logout')}
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full bg-brand text-white py-4 rounded-lg text-lg font-medium"
                >
                  <User className="h-5 w-5" />
                  {t('nav', 'login')}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </div>
  )
}
