'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, User, Key, LogOut, Shield, Sun, Moon, Monitor, ChevronDown } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useTranslations } from './TranslationsProvider'
import { ChangePasswordModal } from './ChangePasswordModal'

interface HeaderClientProps {
  readonly siteName: string
  readonly siteLogoUrl?: string
  readonly navigation: readonly { readonly name: string; readonly href: string }[]
  readonly user: { readonly isAdmin?: boolean } | null
}

/**
 * Both header menus used to open on `:hover` alone. That works with a mouse
 * and nowhere else: on a touch device the first tap opens the menu and the
 * same tap immediately follows the link behind it, and a keyboard user can
 * reach the items but never see them. They are click-driven now, with escape
 * and outside-click to dismiss — same destinations, same actions.
 */
function useDismissable<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  return ref
}

const MENU_PANEL =
  'absolute right-0 top-full mt-2 rounded-xl border border-line bg-card py-1.5 shadow-lg dark:border-line-dark dark:bg-surface-raised z-50'
const MENU_ITEM =
  'flex w-full items-center gap-3 px-3.5 py-2 text-sm text-ink transition-colors hover:bg-neutral-100 dark:text-surface-text dark:hover:bg-neutral-700/60'

export function HeaderClient({ siteName, siteLogoUrl, navigation, user }: HeaderClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslations()
  const { theme, setTheme } = useTheme()

  const themeRef = useDismissable<HTMLDivElement>(themeMenuOpen, () => setThemeMenuOpen(false))
  const userRef = useDismissable<HTMLDivElement>(userMenuOpen, () => setUserMenuOpen(false))

  /**
   * At the top of the page the header is just the masthead and needs no
   * separating line. Once content starts sliding underneath it, it shortens
   * and picks up a blurred backdrop and a hairline, so it reads as a layer
   * above the page rather than part of it.
   */
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = async () => {
    setMobileMenuOpen(false)
    setUserMenuOpen(false)
    await fetch('/api/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  /**
   * `/members` must not light up while the reader is on `/members/top-40-20`,
   * so a nested route only marks its own entry. Exact match plus a boundary
   * check gives that without a route table.
   */
  const isCurrent = (href: string) => {
    if (href === '/') return pathname === '/'
    if (pathname === href) return true
    const deeper = navigation.some((item) => item.href !== href && item.href.startsWith(href + '/'))
    return !deeper && pathname.startsWith(href + '/')
  }

  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: t('common', 'themeLight') },
    { value: 'dark' as const, icon: Moon, label: t('common', 'themeDark') },
    { value: 'system' as const, icon: Monitor, label: t('common', 'themeSystem') },
  ]
  const ActiveThemeIcon = themeOptions.find((o) => o.value === theme)?.icon ?? Monitor

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ${
          scrolled || mobileMenuOpen
            ? 'border-b border-line bg-paper/90 backdrop-blur-xl dark:border-line-dark dark:bg-surface/90'
            : 'border-b border-transparent bg-paper dark:bg-surface'
        }`}
      >
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={`flex items-center justify-between gap-6 transition-[height] duration-300 ${
              scrolled ? 'h-16' : 'h-18'
            }`}
          >
            {/* Logo */}
            <Link href="/" className="flex shrink-0 items-center gap-3">
              {siteLogoUrl ? (
                <Image
                  src={siteLogoUrl}
                  alt={siteName}
                  /* The logo is a CMS upload, so its real aspect ratio is
                     unknown here — `h-10 w-auto` is what actually sizes it.
                     These two are only a resolution hint for srcset. Keeping
                     the height away from the rendered 40px matters: Next warns
                     when exactly one of width/height differs from its
                     attribute, and `height={40}` made that true every render. */
                  width={240}
                  height={80}
                  className="h-10 w-auto dark:invert dark:brightness-0 dark:contrast-200"
                  priority
                />
              ) : (
                /* No logo uploaded: fall back to the organisation's own name
                   rather than a fixed wordmark, so an install with several
                   organisations still reads correctly on each host. */
                <span className="font-display text-xl font-semibold tracking-tight text-brand">
                  {siteName}
                </span>
              )}
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden items-center gap-1 md:flex">
              {navigation.map((item) => {
                const current = isCurrent(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={current ? 'page' : undefined}
                    className={`nav-link mx-2.5 text-sm font-medium transition-colors ${
                      current
                        ? 'text-brand'
                        : 'text-ink-soft hover:text-ink dark:text-neutral-400 dark:hover:text-surface-text'
                    }`}
                  >
                    {item.name}
                    {current && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" aria-hidden />
                    )}
                  </Link>
                )
              })}
            </div>

            <div className="hidden items-center gap-2 md:flex">
              {/* Theme — standalone only for visitors. A signed-in member picks
                  the theme inside the profile dropdown instead, so the header
                  carries one control, not two. */}
              {!user && (
                <div className="relative" ref={themeRef}>
                  <button
                    type="button"
                    onClick={() => setThemeMenuOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={themeMenuOpen}
                    aria-label={t('common', 'theme')}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-neutral-200/60 hover:text-ink dark:text-neutral-400 dark:hover:bg-neutral-700/60 dark:hover:text-surface-text"
                  >
                    <ActiveThemeIcon className="h-[18px] w-[18px]" />
                  </button>
                  {themeMenuOpen && (
                    <div className={`${MENU_PANEL} w-44`} role="menu">
                      {themeOptions.map(({ value, icon: Icon, label }) => (
                        <button
                          key={value}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setTheme(value)
                            setThemeMenuOpen(false)
                          }}
                          className={`${MENU_ITEM} ${theme === value ? 'text-brand dark:text-brand' : ''}`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* User actions */}
              {user ? (
                <div className="relative" ref={userRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                    aria-label={t('profile', 'title')}
                    className="flex items-center gap-2 rounded-lg border border-line-strong px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-ink dark:border-line-dark dark:text-surface-text dark:hover:border-neutral-400"
                  >
                    <User className="h-4 w-4" />
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {userMenuOpen && (
                    <div className={`${MENU_PANEL} w-52`} role="menu">
                      <Link
                        href="/my-profile"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className={MENU_ITEM}
                      >
                        <User className="h-4 w-4" />
                        {t('nav', 'myProfile')}
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setUserMenuOpen(false)
                          setShowPasswordModal(true)
                        }}
                        className={MENU_ITEM}
                      >
                        <Key className="h-4 w-4" />
                        {t('profile', 'changePassword')}
                      </button>
                      {user.isAdmin && (
                        <>
                          <hr className="my-1.5 border-line dark:border-line-dark" />
                          <Link
                            href="/admin"
                            target="_blank"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className={MENU_ITEM}
                          >
                            <Shield className="h-4 w-4" />
                            {t('nav', 'adminPanel')}
                          </Link>
                        </>
                      )}
                      <hr className="my-1.5 border-line dark:border-line-dark" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className={`${MENU_ITEM} text-brand dark:text-brand`}
                      >
                        <LogOut className="h-4 w-4" />
                        {t('nav', 'logout')}
                      </button>
                      <hr className="my-1.5 border-line dark:border-line-dark" />
                      {/* All three themes side by side. Picking one applies it
                          without closing the menu, so flipping between them to
                          compare costs one click each, not three. */}
                      <div
                        className="flex items-center gap-1 px-2 py-1"
                        role="group"
                        aria-label={t('common', 'theme')}
                      >
                        {themeOptions.map(({ value, icon: Icon, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setTheme(value)}
                            aria-pressed={theme === value}
                            title={label}
                            className={`flex flex-1 items-center justify-center rounded-lg p-2 transition-colors ${
                              theme === value
                                ? 'bg-brand/10 text-brand'
                                : 'text-ink-soft hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-800'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="btn btn-primary px-5 py-2.5">
                  {t('nav', 'login')}
                </Link>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="-mr-2 p-2 text-ink dark:text-surface-text md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label={t('common', 'menu')}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu.
          Deliberately a sibling of the header, not a child of it. The header
          turns on `backdrop-blur` while this is open, and `backdrop-filter`
          makes an element a containing block for its `position: fixed`
          descendants — so nested inside, this panel's `top`/`bottom` resolved
          against the 72px header instead of the viewport and it rendered
          exactly 0px tall, links and all. */}
      {/* Mobile Menu - Full screen overlay */}
      {mobileMenuOpen && (
        <div
          className={`fixed inset-x-0 bottom-0 z-50 overflow-y-auto bg-paper dark:bg-surface md:hidden ${
            scrolled ? 'top-16' : 'top-18'
          }`}
        >
          <div className="flex min-h-full flex-col px-4 pb-8 pt-4">
            <div className="flex flex-col">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isCurrent(item.href) ? 'page' : undefined}
                  className={`border-b border-line py-3.5 font-display text-lg font-medium tracking-tight transition-colors dark:border-line-dark ${
                    isCurrent(item.href) ? 'text-brand' : 'text-ink dark:text-surface-text'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* User Actions */}
            <div className="mt-6">
              {user ? (
                <div className="flex flex-col gap-1">
                  <Link
                    href="/my-profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-neutral-200/60 dark:text-surface-text dark:hover:bg-neutral-800"
                  >
                    <User className="h-4 w-4" />
                    {t('nav', 'myProfile')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setShowPasswordModal(true)
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-neutral-200/60 dark:text-surface-text dark:hover:bg-neutral-800"
                  >
                    <Key className="h-4 w-4" />
                    {t('profile', 'changePassword')}
                  </button>
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      target="_blank"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-neutral-200/60 dark:text-surface-text dark:hover:bg-neutral-800"
                    >
                      <Shield className="h-4 w-4" />
                      {t('nav', 'adminPanel')}
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-brand hover:bg-neutral-200/60 dark:hover:bg-neutral-800"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('nav', 'logout')}
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-primary w-full"
                >
                  <User className="h-4 w-4" />
                  {t('nav', 'login')}
                </Link>
              )}
            </div>

            {/* Theme Selection - at bottom */}
            <div className="mt-auto flex items-center gap-3 border-t border-line pt-5 dark:border-line-dark">
              <span className="eyebrow">{t('common', 'theme')}</span>
              <div className="flex gap-1">
                {themeOptions.map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    aria-pressed={theme === value}
                    className={`rounded-lg p-2 transition-colors ${
                      theme === value
                        ? 'bg-brand/10 text-brand'
                        : 'text-ink-soft hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-800'
                    }`}
                    title={label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </>
  )
}
