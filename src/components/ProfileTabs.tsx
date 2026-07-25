'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Users,
  Trophy,
  Presentation,
  Search,
  Microscope,
  LayoutGrid,
  Table,
  Pencil,
  Trash2,
  Upload,
  Download,
  Star,
  Activity,
  HelpCircle,
  X,
  UsersRound,
} from 'lucide-react'
import { SpecialRequestModal } from './SpecialRequestModal'
import { SuccessStoryModal } from './SuccessStoryModal'
import { ConfirmDialog } from './ConfirmDialog'
import { AboutMeForm } from './AboutMeForm'
import { SpecialRequestsList } from './SpecialRequestsList'
import { SuccessStoryCard } from './SuccessStoryCard'
import { ProspectListSection } from './ProspectListSection'
import { useTranslations } from './TranslationsProvider'

interface SpecialRequest {
  id: string | number
  request: string
  registrationNumber?: string | null
  createdAt: string
  sortOrder?: number
  showOnSlide?: boolean
}

interface Top40Entry {
  id: string | number
  companyName: string
  contactPerson: string
  position?: string | null
  registrationNumber?: string | null
  notes?: string | null
  businessTags?: string | null
  createdAt: string
}

interface SuccessStory {
  id: string | number
  title: string
  story: string
  businessValue?: string | null
  partnerMember?:
    | {
        id: string | number
        name: string
        surname: string
        slug?: string
      }
    | string
    | number
    | null
  createdAt: string
}

interface Member {
  id: string | number
  name: string
  surname: string
}

interface GalleryItem {
  id?: string | number | null
  image: string | number | { id: string | number; url?: string | null }
  caption?: string | null
}

interface UserData {
  name: string
  surname: string
  phone: string
  description: unknown
  company: string
  jobPosition: string
  orgRole: string
  companyPhone: string
  companyEmail: string
  website: string
  country?: string
  companyDescription: string
  powerGroup: string | null
  gallery: GalleryItem[]
  profileImageUrl?: string
  logoUrl?: string
  tyfcbGiven?: number | null
  tyfcbReceived?: number | null
}

interface AboutMeUserData {
  name: string
  surname: string
  phone: string
  description: string
  company: string
  companyPhone: string
  companyEmail: string
  website: string
  companyDescription: string
  powerGroup: string | null
  gallery: GalleryItem[]
}

interface PowerGroup {
  id: string | number
  title: string
}

interface ProfileTabsProps {
  readonly activeTab:
    | 'about'
    | 'special-requests'
    | 'top40'
    | 'top20'
    | 'success-stories'
    | 'presentation'
    | 'group-slide'
    | 'activities'
  readonly specialRequestsCount: number
  readonly top40Count: number
  readonly top20Count: number
  readonly successStoriesCount: number
  readonly specialRequests?: ReadonlyArray<SpecialRequest>
  readonly top40Entries?: ReadonlyArray<Top40Entry>
  readonly top20Entries?: ReadonlyArray<Top40Entry>
  readonly successStories?: ReadonlyArray<SuccessStory>
  readonly members?: ReadonlyArray<Member>
  readonly userData?: UserData
  readonly children?: React.ReactNode
  readonly enableActivities?: boolean
  readonly enableSuccessStories?: boolean
  readonly isPowerGroupLead?: boolean
  readonly siteId?: string | number
  readonly powerGroups?: ReadonlyArray<PowerGroup>
  readonly userEmail?: string
  readonly pendingEmail?: string | null
}

interface TabButtonProps {
  href: string
  isActive: boolean
  icon: React.ReactNode
  label: string
  count?: number
}

function TabButton({ href, isActive, icon, label, count }: Readonly<TabButtonProps>) {
  const baseClasses =
    'flex items-center justify-center gap-2 p-3 sm:px-6 sm:py-3 rounded-lg text-sm font-medium transition-colors'
  const activeClasses = 'bg-brand text-white'
  const inactiveClasses =
    'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-600'
  const className = `${baseClasses} ${isActive ? activeClasses : inactiveClasses} ${count === undefined ? '' : 'relative'}`

  return (
    <Link href={href} className={className} title={label}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full min-w-5 text-center ${
            isActive
              ? 'bg-white/20 text-white'
              : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  )
}

export function ProfileTabs({
  activeTab,
  specialRequestsCount,
  top40Count,
  top20Count,
  successStoriesCount,
  specialRequests = [],
  top40Entries = [],
  top20Entries = [],
  successStories = [],
  members = [],
  userData,
  children,
  enableActivities = false,
  enableSuccessStories = true,
  isPowerGroupLead = false,
  siteId,
  powerGroups = [],
  userEmail,
  pendingEmail,
}: Readonly<ProfileTabsProps>) {
  const router = useRouter()
  const { t } = useTranslations()
  const [showSpecialRequestModal, setShowSpecialRequestModal] = useState(false)
  const [showSuccessStoryModal, setShowSuccessStoryModal] = useState(false)
  const [editSpecialRequest, setEditSpecialRequest] = useState<SpecialRequest | null>(null)
  const [editSuccessStory, setEditSuccessStory] = useState<{
    id: string | number
    title: string
    story: string
    businessValue?: string | null
    partnerMember?: string | number | null
  } | null>(null)
  const [deleting, setDeleting] = useState<string | number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'special-request' | 'success-story'
    id: string | number
  } | null>(null)

  const handleDeleteSpecialRequest = (id: string | number) => {
    setConfirmDelete({ type: 'special-request', id })
  }

  const handleDeleteSuccessStory = (id: string | number) => {
    setConfirmDelete({ type: 'success-story', id })
  }

  const executeDelete = async () => {
    if (!confirmDelete) return

    setDeleting(confirmDelete.id)
    try {
      const endpoints = {
        'special-request': '/api/special-requests',
        'success-story': '/api/success-stories',
      }
      await fetch(`${endpoints[confirmDelete.type]}/${confirmDelete.id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const getDeleteDialogContent = () => {
    if (!confirmDelete) return { title: '', message: '' }

    const content = {
      'special-request': {
        title: t('common', 'confirmDelete'),
        message: t('specialRequest', 'confirmDeleteMessage'),
      },
      'success-story': {
        title: t('common', 'confirmDelete'),
        message: t('successStory', 'confirmDeleteMessage'),
      },
    }
    return content[confirmDelete.type]
  }

  return (
    <>
      {/* Tab Buttons - icons only on mobile, full on desktop */}
      <div className="flex gap-1 sm:gap-2 mb-6 overflow-x-auto">
        <TabButton
          href="/my-profile"
          isActive={activeTab === 'about'}
          icon={<User className="h-5 w-5 sm:h-4 sm:w-4" />}
          label={t('profile', 'aboutMe')}
        />
        <TabButton
          href="/my-profile/my-requests"
          isActive={activeTab === 'special-requests'}
          icon={<Users className="h-5 w-5 sm:h-4 sm:w-4" />}
          label={t('profile', 'specialRequests')}
          count={specialRequestsCount}
        />
        <TabButton
          href="/my-profile/my-top40"
          isActive={activeTab === 'top40'}
          icon={<Trophy className="h-5 w-5 sm:h-4 sm:w-4" />}
          label={t('profile', 'top40')}
          count={top40Count}
        />
        <TabButton
          href="/my-profile/my-top20"
          isActive={activeTab === 'top20'}
          icon={<Microscope className="h-5 w-5 sm:h-4 sm:w-4" />}
          label={t('profile', 'top20')}
          count={top20Count}
        />
        {enableSuccessStories && (
          <TabButton
            href="/my-profile/success-stories"
            isActive={activeTab === 'success-stories'}
            icon={<Star className="h-5 w-5 sm:h-4 sm:w-4" />}
            label={t('profile', 'successStories')}
            count={successStoriesCount}
          />
        )}
        <TabButton
          href="/my-profile/presentation"
          isActive={activeTab === 'presentation'}
          icon={<Presentation className="h-5 w-5 sm:h-4 sm:w-4" />}
          label={t('profile', 'presentationSlide')}
        />
        {isPowerGroupLead && (
          <TabButton
            href="/my-profile/group-slide"
            isActive={activeTab === 'group-slide'}
            icon={<UsersRound className="h-5 w-5 sm:h-4 sm:w-4" />}
            label={t('profile', 'groupSlide')}
          />
        )}
        {enableActivities && (
          <TabButton
            href="/my-profile/activities"
            isActive={activeTab === 'activities'}
            icon={<Activity className="h-5 w-5 sm:h-4 sm:w-4" />}
            label={t('profile', 'activities')}
          />
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'about' && userData && (
        <AboutMeForm
          initialData={{
            name: userData.name,
            surname: userData.surname,
            phone: userData.phone,
            description: typeof userData.description === 'string' ? userData.description : '',
            company: userData.company,
            jobPosition: userData.jobPosition || '',
            orgRole: userData.orgRole || '',
            companyPhone: userData.companyPhone,
            companyEmail: userData.companyEmail,
            website: userData.website,
            country: userData.country || '',
            companyDescription: userData.companyDescription,
            powerGroup: userData.powerGroup || null,
            gallery: userData.gallery,
            profileImageUrl: userData.profileImageUrl,
            logoUrl: userData.logoUrl,
            tyfcbGiven: userData.tyfcbGiven ?? null,
            tyfcbReceived: userData.tyfcbReceived ?? null,
          }}
          siteId={siteId}
          powerGroups={powerGroups}
          userEmail={userEmail}
          pendingEmail={pendingEmail}
        />
      )}

      {activeTab === 'special-requests' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-ink dark:text-surface-text">
              {t('profile', 'mySpecialRequests')}
            </h2>
            <button
              onClick={() => setShowSpecialRequestModal(true)}
              className="flex items-center justify-center w-10 h-10 bg-brand text-white rounded-full hover:bg-brand-dark transition-colors"
            >
              <span className="text-xl">+</span>
            </button>
          </div>

          {specialRequests.length > 0 ? (
            <SpecialRequestsList
              requests={specialRequests}
              onEdit={(req) => {
                setEditSpecialRequest(req as SpecialRequest)
                setShowSpecialRequestModal(true)
              }}
              onDelete={handleDeleteSpecialRequest}
              deletingId={deleting}
            />
          ) : (
            <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
              {t('profile', 'noSpecialRequests')}
            </p>
          )}
        </>
      )}

      {activeTab === 'top40' && (
        <ProspectListSection
          apiBase="/api/top40"
          entries={top40Entries}
          siteId={siteId}
          heading={t('profile', 'myTop40')}
          emptyText={t('profile', 'noTop40')}
          viewModeStorageKey="top40-view-mode"
          exportFileNamePrefix="My_Top40"
          sheetName="Top 40"
          modalAddTitle={t('top40', 'addTitle')}
          modalEditTitle={t('top40', 'editTitle')}
          listLabel={t('profile', 'top40')}
        />
      )}

      {activeTab === 'top20' && (
        <ProspectListSection
          apiBase="/api/top20"
          entries={top20Entries}
          siteId={siteId}
          heading={t('profile', 'myTop20')}
          emptyText={t('profile', 'noTop20')}
          viewModeStorageKey="top20-view-mode"
          exportFileNamePrefix="My_Top20"
          sheetName="Top 20"
          modalAddTitle={t('top20', 'addTitle')}
          modalEditTitle={t('top20', 'editTitle')}
          listLabel={t('profile', 'top20')}
          requireContactPerson={false}
        />
      )}

      {activeTab === 'success-stories' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-ink dark:text-surface-text">
              {t('profile', 'mySuccessStories')}
            </h2>
            <button
              onClick={() => setShowSuccessStoryModal(true)}
              className="flex items-center justify-center w-10 h-10 bg-brand text-white rounded-full hover:bg-brand-dark transition-colors"
            >
              <span className="text-xl">+</span>
            </button>
          </div>

          {successStories.length > 0 ? (
            <div className="space-y-4">
              {successStories.map((story) => (
                <SuccessStoryCard
                  key={story.id}
                  story={story}
                  showActions={true}
                  onEdit={(s) => {
                    setEditSuccessStory(s)
                    setShowSuccessStoryModal(true)
                  }}
                  onDelete={handleDeleteSuccessStory}
                  isDeleting={deleting === story.id}
                />
              ))}
            </div>
          ) : (
            <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
              {t('profile', 'noSuccessStories')}
            </p>
          )}
        </>
      )}

      {activeTab === 'presentation' && children}

      {activeTab === 'group-slide' && children}

      {activeTab === 'activities' && children}

      <SpecialRequestModal
        isOpen={showSpecialRequestModal}
        onClose={() => {
          setShowSpecialRequestModal(false)
          setEditSpecialRequest(null)
        }}
        editData={editSpecialRequest}
        siteId={siteId}
      />
      <SuccessStoryModal
        isOpen={showSuccessStoryModal}
        onClose={() => {
          setShowSuccessStoryModal(false)
          setEditSuccessStory(null)
        }}
        members={members}
        editData={editSuccessStory}
        siteId={siteId}
      />
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={executeDelete}
        title={getDeleteDialogContent().title}
        message={getDeleteDialogContent().message}
        loading={!!deleting}
      />
    </>
  )
}
