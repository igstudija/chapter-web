/**
 * MyProfilePageWrapper
 *
 * Shared wrapper component for all my-profile pages.
 * Provides consistent layout with Breadcrumb, MemberProfileHeader, and ProfileTabs.
 */

import { MemberProfileHeader, Breadcrumb } from '@/components'
import { ProfileTabs } from '@/components/ProfileTabs'
import type { MediaImage, ProfileTabCounts } from '@/lib/myProfileData'
import type { ReactNode } from 'react'

export type ProfileTabName =
  | 'about'
  | 'special-requests'
  | 'top40'
  | 'top20'
  | 'success-stories'
  | 'presentation'
  | 'group-slide'

interface MyProfilePageWrapperProps {
  readonly breadcrumbItems: ReadonlyArray<{ label: string; href?: string }>

  readonly member: {
    readonly name: string
    readonly surname: string
    readonly company: string
    readonly jobPosition?: string | null
    readonly companyEmail: string
    readonly companyPhone: string
    readonly website: string
  }
  readonly profileImage: MediaImage | null
  readonly logo: MediaImage | null
  readonly previewLink?: string

  readonly activeTab: ProfileTabName
  readonly tabCounts: ProfileTabCounts
  readonly enableSuccessStories?: boolean
  readonly isPowerGroupLead?: boolean

  readonly siteId?: string | number

  readonly userData?: any
  readonly specialRequests?: readonly any[]
  readonly top40Entries?: readonly any[]
  readonly top20Entries?: readonly any[]
  readonly successStories?: readonly any[]
  readonly members?: readonly any[]
  readonly powerGroups?: ReadonlyArray<{ id: string | number; title: string }>
  readonly userEmail?: string
  readonly pendingEmail?: string | null

  readonly children?: ReactNode
}

export function MyProfilePageWrapper({
  breadcrumbItems,
  member,
  profileImage,
  logo,
  previewLink,
  activeTab,
  tabCounts,
  enableSuccessStories = true,
  isPowerGroupLead = false,
  siteId,
  userData,
  specialRequests,
  top40Entries,
  top20Entries,
  successStories,
  members,
  powerGroups,
  userEmail,
  pendingEmail,
  children,
}: MyProfilePageWrapperProps) {
  return (
    <div className="min-h-screen bg-paper dark:bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={breadcrumbItems} />

        {/*
          This shell only ever renders the signed-in member's own profile, so
          the masthead owns the picture and logo — see `ProfileMediaEditor`.
        */}
        <MemberProfileHeader
          member={member}
          profileImage={profileImage}
          logo={logo}
          previewLink={previewLink}
          editable
        />

        <ProfileTabs
          activeTab={activeTab}
          specialRequestsCount={tabCounts.specialRequestsCount}
          top40Count={tabCounts.top40Count}
          top20Count={tabCounts.top20Count}
          successStoriesCount={tabCounts.successStoriesCount}
          enableSuccessStories={enableSuccessStories}
          isPowerGroupLead={isPowerGroupLead}
          siteId={siteId}
          userData={userData}
          specialRequests={specialRequests}
          top40Entries={top40Entries}
          top20Entries={top20Entries}
          successStories={successStories}
          members={members}
          powerGroups={powerGroups}
          userEmail={userEmail}
          pendingEmail={pendingEmail}
        >
          {children}
        </ProfileTabs>
      </div>
    </div>
  )
}
