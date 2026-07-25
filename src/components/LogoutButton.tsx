'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useTranslations } from './TranslationsProvider'

export function LogoutButton() {
  const router = useRouter()
  const { t } = useTranslations()

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-sm text-neutral-700"
    >
      <LogOut className="h-4 w-4" />
      {t('nav', 'logout')}
    </button>
  )
}
