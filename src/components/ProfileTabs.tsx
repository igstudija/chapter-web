'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  HelpCircle,
  X,
  UsersRound,
  Plus,
} from 'lucide-react'
import { TabNav } from './TabNav'
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
  readonly enableSuccessStories?: boolean
  readonly isPowerGroupLead?: boolean
  readonly siteId?: string | number
  readonly powerGroups?: ReadonlyArray<PowerGroup>
  readonly userEmail?: string
  readonly pendingEmail?: string | null
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
      <TabNav
        ariaLabel={t('profile', 'title')}
        items={[
          {
            href: '/my-profile',
            active: activeTab === 'about',
            icon: <User className="h-4 w-4" />,
            label: t('profile', 'aboutMe'),
          },
          {
            href: '/my-profile/my-requests',
            active: activeTab === 'special-requests',
            icon: <Users className="h-4 w-4" />,
            label: t('profile', 'specialRequests'),
            count: specialRequestsCount,
          },
          {
            href: '/my-profile/my-top40',
            active: activeTab === 'top40',
            icon: <Trophy className="h-4 w-4" />,
            label: t('profile', 'top40'),
            count: top40Count,
          },
          {
            href: '/my-profile/my-top20',
            active: activeTab === 'top20',
            icon: <Microscope className="h-4 w-4" />,
            label: t('profile', 'top20'),
            count: top20Count,
          },
          ...(enableSuccessStories
            ? [
                {
                  href: '/my-profile/success-stories',
                  active: activeTab === 'success-stories',
                  icon: <Star className="h-4 w-4" />,
                  label: t('profile', 'successStories'),
                  count: successStoriesCount,
                },
              ]
            : []),
          {
            href: '/my-profile/presentation',
            active: activeTab === 'presentation',
            icon: <Presentation className="h-4 w-4" />,
            label: t('profile', 'presentationSlide'),
          },
          ...(isPowerGroupLead
            ? [
                {
                  href: '/my-profile/group-slide',
                  active: activeTab === 'group-slide',
                  icon: <UsersRound className="h-4 w-4" />,
                  label: t('profile', 'groupSlide'),
                },
              ]
            : []),
        ]}
      />

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
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-xl font-bold tracking-tight text-ink dark:text-surface-text">
              {t('profile', 'mySpecialRequests')}
            </h2>
            <button
              type="button"
              onClick={() => setShowSpecialRequestModal(true)}
              className="btn btn-primary px-4 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4" />
              {t('common', 'add')}
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
            <p className="border-t border-line py-12 text-sm text-ink-soft dark:border-line-dark dark:text-neutral-400">
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
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-xl font-bold tracking-tight text-ink dark:text-surface-text">
              {t('profile', 'mySuccessStories')}
            </h2>
            <button
              type="button"
              onClick={() => setShowSuccessStoryModal(true)}
              className="btn btn-primary px-4 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4" />
              {t('common', 'add')}
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
            <p className="border-t border-line py-12 text-sm text-ink-soft dark:border-line-dark dark:text-neutral-400">
              {t('profile', 'noSuccessStories')}
            </p>
          )}
        </>
      )}

      {activeTab === 'presentation' && children}

      {activeTab === 'group-slide' && children}

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
