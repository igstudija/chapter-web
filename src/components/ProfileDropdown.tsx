'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Key, LogOut, ChevronDown, Shield } from 'lucide-react'
import { ChangePasswordModal } from './ChangePasswordModal'
import { useTranslations } from './TranslationsProvider'

interface ProfileDropdownProps {
  userRole?: 'member-admin' | 'member' | 'superadmin' | null
}

export function ProfileDropdown({ userRole }: Readonly<ProfileDropdownProps>) {
  const router = useRouter()
  const { t } = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors text-sm font-medium"
        >
          <User className="h-4 w-4" />
          {t('profile', 'title')}
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-50">
            <Link
              href="/my-profile"
              className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              onClick={() => setIsOpen(false)}
            >
              <User className="h-4 w-4" />
              {t('nav', 'myProfile')}
            </Link>
            <button
              onClick={() => {
                setIsOpen(false)
                setShowPasswordModal(true)
              }}
              className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 w-full text-left"
            >
              <Key className="h-4 w-4" />
              {t('profile', 'changePassword')}
            </button>
            {(userRole === 'member-admin' || userRole === 'superadmin') && (
              <>
                <hr className="my-1 border-neutral-100 dark:border-neutral-700" />
                <Link
                  href="/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  onClick={() => setIsOpen(false)}
                >
                  <Shield className="h-4 w-4" />
                  {t('nav', 'adminPanel')}
                </Link>
              </>
            )}
            <hr className="my-1 border-neutral-100 dark:border-neutral-700" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 w-full text-left"
            >
              <LogOut className="h-4 w-4" />
              {t('nav', 'logout')}
            </button>
          </div>
        )}
      </div>

      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </>
  )
}
