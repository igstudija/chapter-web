'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, User, Key, LogOut, Shield, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useTranslations } from './TranslationsProvider'
import { ChangePasswordModal } from './ChangePasswordModal'

interface HeaderClientProps {
  readonly siteName: string
  readonly siteLogoUrl?: string
  readonly navigation: readonly { readonly name: string; readonly href: string }[]
  readonly user: { readonly isAdmin?: boolean } | null
}

export function HeaderClient({ siteName, siteLogoUrl, navigation, user }: HeaderClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const router = useRouter()
  const { t } = useTranslations()
  const { theme, setTheme } = useTheme()

  const handleLogout = async () => {
    setMobileMenuOpen(false)
    await fetch('/api/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-5 w-5" />
      case 'dark':
        return <Moon className="h-5 w-5" />
      default:
        return <Monitor className="h-5 w-5" />
    }
  }

  return (
    <>
      <header className="bg-white dark:bg-neutral-800 shadow-sm sticky top-0 z-50 transition-colors">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              {siteLogoUrl ? (
                <Image
                  src={siteLogoUrl}
                  alt={siteName}
                  width={120}
                  height={40}
                  className="h-10 w-auto dark:invert dark:brightness-0 dark:contrast-200"
                  priority
                />
              ) : (
                /* No logo uploaded: fall back to the organisation's own name
                   rather than a fixed wordmark, so an install with several
                   organisations still reads correctly on each host. */
                <span className="text-2xl font-bold text-brand">{siteName}</span>
              )}
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-ink dark:text-surface-text hover:text-brand transition-colors font-medium text-sm"
                >
                  {item.name}
                </Link>
              ))}

              {/* Desktop Theme Toggle */}
              <div className="relative group">
                <button
                  className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-neutral-600 dark:text-neutral-300"
                  aria-label="Toggle theme"
                >
                  {getThemeIcon()}
                </button>
                <div className="absolute right-0 mt-0 w-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <button
                    onClick={() => setTheme('light')}
                    className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                      theme === 'light'
                        ? 'text-brand font-medium'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                    {t('common', 'themeLight')}
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                      theme === 'dark'
                        ? 'text-brand font-medium'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <Moon className="h-4 w-4" />
                    {t('common', 'themeDark')}
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                      theme === 'system'
                        ? 'text-brand font-medium'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <Monitor className="h-4 w-4" />
                    {t('common', 'themeSystem')}
                  </button>
                </div>
              </div>

              {/* Desktop User Actions */}
              {user ? (
                <div className="relative group">
                  <button className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors text-sm font-medium">
                    <User className="h-4 w-4" />
                    {t('profile', 'title')}
                  </button>
                  <div className="absolute right-0 mt-0 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <Link
                      href="/my-profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                    >
                      <User className="h-4 w-4" />
                      {t('nav', 'myProfile')}
                    </Link>
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 w-full text-left"
                    >
                      <Key className="h-4 w-4" />
                      {t('profile', 'changePassword')}
                    </button>
                    {user.isAdmin && (
                      <>
                        <hr className="my-1 border-neutral-100 dark:border-neutral-700" />
                        <Link
                          href="/admin"
                          target="_blank"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                        >
                          <Shield className="h-4 w-4" />
                          {t('nav', 'adminPanel')}
                        </Link>
                      </>
                    )}
                    <hr className="my-1 border-neutral-100 dark:border-neutral-700" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 w-full text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('nav', 'logout')}
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
                >
                  {t('nav', 'login')}
                </Link>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="md:hidden p-2 text-ink dark:text-surface-text"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={t('common', 'menu')}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu - Full screen overlay */}
          {mobileMenuOpen && (
            <div className="md:hidden fixed inset-0 top-16 z-50 bg-white dark:bg-neutral-800 h-[calc(100vh-4rem)] w-full overflow-y-auto">
              <div className="flex flex-col px-4 py-2">
                {/* Navigation Links - vertical list */}
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-3 text-sm font-medium text-ink dark:text-surface-text hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  >
                    {item.name}
                  </Link>
                ))}

                {/* User Actions */}
                <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  {user ? (
                    <div className="flex flex-col">
                      <Link
                        href="/my-profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 py-2 px-3 text-sm font-medium text-ink dark:text-surface-text hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      >
                        <User className="h-4 w-4" />
                        {t('nav', 'myProfile')}
                      </Link>
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false)
                          setShowPasswordModal(true)
                        }}
                        className="flex items-center gap-2 py-2 px-3 text-sm font-medium text-ink dark:text-surface-text hover:bg-neutral-100 dark:hover:bg-neutral-700 w-full text-left"
                      >
                        <Key className="h-4 w-4" />
                        {t('profile', 'changePassword')}
                      </button>
                      {user.isAdmin && (
                        <Link
                          href="/admin"
                          target="_blank"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-2 py-2 px-3 text-sm font-medium text-ink dark:text-surface-text hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        >
                          <Shield className="h-4 w-4" />
                          {t('nav', 'adminPanel')}
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 py-2 px-3 text-sm font-medium text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 w-full text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        {t('nav', 'logout')}
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 w-full bg-brand text-white py-2 rounded text-sm font-medium"
                    >
                      <User className="h-4 w-4" />
                      {t('nav', 'login')}
                    </Link>
                  )}
                </div>

                {/* Theme Selection - at bottom */}
                <div className="mt-auto pt-2 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-2 px-3">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {t('common', 'theme')}:
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-1.5 rounded ${
                        theme === 'light'
                          ? 'bg-brand/10 text-brand'
                          : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }`}
                      title={t('common', 'themeLight')}
                    >
                      <Sun className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-1.5 rounded ${
                        theme === 'dark'
                          ? 'bg-brand/10 text-brand'
                          : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }`}
                      title={t('common', 'themeDark')}
                    >
                      <Moon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setTheme('system')}
                      className={`p-1.5 rounded ${
                        theme === 'system'
                          ? 'bg-brand/10 text-brand'
                          : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }`}
                      title={t('common', 'themeSystem')}
                    >
                      <Monitor className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Password Modal */}
      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </>
  )
}
