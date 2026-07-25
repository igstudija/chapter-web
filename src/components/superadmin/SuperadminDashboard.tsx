'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Site, User, SiteMembership } from '@/payload-types'
import { SitesTable } from './SitesTable'
import { UsersTable } from './UsersTable'
import { MembershipsTable } from './MembershipsTable'
import { AuditLogsTable } from './AuditLogsTable'
import { PolicyTemplatesTable } from './PolicyTemplatesTable'
import { AiSettingsTable } from './AiSettingsTable'
import { PerplexityToolsTable } from './PerplexityToolsTable'
import { LogsTable } from './LogsTable'
import { SUPERADMIN_TITLE } from '@/lib/branding'

type Tab = 'sites' | 'users' | 'memberships' | 'policy-templates' | 'audit-logs' | 'ai-settings' | 'ai-tools' | 'logs'

interface SuperadminDashboardProps {
  sites: Site[]
  users: User[]
  memberships: SiteMembership[]
  currentUser: User
}

export function SuperadminDashboard({
  sites,
  users,
  memberships,
  currentUser,
}: Readonly<SuperadminDashboardProps>) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('memberships')

  const handleLogout = async () => {
    await fetch('/api/users/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'sites', label: 'Sites', count: sites.length },
    { id: 'users', label: 'Users', count: users.length },
    { id: 'memberships', label: 'Site Memberships', count: memberships.length },
    { id: 'policy-templates', label: 'Policy Templates' },
    { id: 'ai-settings', label: 'AI Settings' },
    { id: 'ai-tools', label: 'AI Tools' },
    { id: 'audit-logs', label: 'Audit Logs' },
    { id: 'logs', label: 'App Logs' },
  ]

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{SUPERADMIN_TITLE}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Logged in as {currentUser.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'sites' && <SitesTable sites={sites} />}

        {activeTab === 'users' && (
          <UsersTable users={users} memberships={memberships} sites={sites} />
        )}

        {activeTab === 'memberships' && (
          <MembershipsTable memberships={memberships} sites={sites} users={users} />
        )}

        {activeTab === 'policy-templates' && <PolicyTemplatesTable />}

        {activeTab === 'ai-settings' && <AiSettingsTable />}

        {activeTab === 'ai-tools' && <PerplexityToolsTable sites={sites} />}

        {activeTab === 'audit-logs' && <AuditLogsTable />}

        {activeTab === 'logs' && <LogsTable />}
      </div>
    </div>
  )
}
