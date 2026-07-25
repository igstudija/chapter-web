'use client'

import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useTranslations } from './TranslationsProvider'
import { ActivityStatsCard } from './ActivityStatsCard'
import { MeetingCard } from './MeetingCard'
import { ReferralCard } from './ReferralCard'
import { OneToOneMeetingModal } from './OneToOneMeetingModal'
import { ReferralModal } from './ReferralModal'

interface Member {
  id: string | number
  name: string
  surname: string
}

interface Comment {
  text: string
  author: {
    id: string | number
    name: string
    surname: string
  } | null
  commentCreatedAt: string
}

interface Meeting {
  id: string | number
  metWith: {
    id: string | number
    name: string
    surname: string
  } | null
  invitedBy: {
    id: string | number
    name: string
    surname: string
  } | null
  location: string
  topics: string
  date: string
  comments: Comment[]
  createdBy: {
    id: string | number
  }
}

interface Referral {
  id: string | number
  fromUser: {
    id: string | number
    name: string
    surname: string
  } | null
  toUser: {
    id: string | number
    name: string
    surname: string
  } | null
  date: string
  description: string
  status: 'pending' | 'success' | 'failed'
  value?: number | null
  createdBy: {
    id: string | number
  }
}

interface ActivitiesContentProps {
  userId: string
  meetings: Meeting[]
  referralsGiven: Referral[]
  referralsReceived: Referral[]
  members: Member[]
}

export function ActivitiesContent({
  userId,
  meetings,
  referralsGiven,
  referralsReceived,
  members,
}: Readonly<ActivitiesContentProps>) {
  const { t } = useTranslations()
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [showReferralGivenModal, setShowReferralGivenModal] = useState(false)
  const [showReferralReceivedModal, setShowReferralReceivedModal] = useState(false)
  const [editMeeting, setEditMeeting] = useState<{
    id: string | number
    metWith: string | number
    invitedBy: string | number
    location: string
    topics: string
    date: string
  } | null>(null)
  const [editReferralGiven, setEditReferralGiven] = useState<{
    id: string | number
    fromUser: string | number
    toUser: string | number
    date: string
    description: string
    status?: string
    value?: number | null
  } | null>(null)
  const [editReferralReceived, setEditReferralReceived] = useState<{
    id: string | number
    fromUser: string | number
    toUser: string | number
    date: string
    description: string
    status?: string
    value?: number | null
  } | null>(null)

  // Calculate stats from actual data
  const stats = useMemo(() => {
    // Saņemtais bizness - sum of successful received referrals
    const receivedBusiness = referralsReceived
      .filter((r) => r.status === 'success' && r.value)
      .reduce((sum, r) => sum + (r.value || 0), 0)

    // Saņemtie ieteikumi - count of received referrals
    const receivedCount = referralsReceived.length

    // Dotie ieteikumi - count of given referrals
    const givenCount = referralsGiven.length

    // Sniegtais bizness - sum of successful given referrals (what the receiver reported)
    const givenBusiness = referralsGiven
      .filter((r) => r.status === 'success' && r.value)
      .reduce((sum, r) => sum + (r.value || 0), 0)

    return {
      receivedBusiness,
      receivedCount,
      givenCount,
      givenBusiness,
    }
  }, [referralsGiven, referralsReceived])

  const handleEditMeeting = (meeting: Meeting) => {
    setEditMeeting({
      id: meeting.id,
      metWith: meeting.metWith?.id || '',
      invitedBy: meeting.invitedBy?.id || '',
      location: meeting.location,
      topics: meeting.topics,
      date: meeting.date,
    })
    setShowMeetingModal(true)
  }

  const handleEditReferralGiven = (referral: Referral) => {
    setEditReferralGiven({
      id: referral.id,
      fromUser: referral.fromUser?.id || '',
      toUser: referral.toUser?.id || '',
      date: referral.date,
      description: referral.description,
      status: referral.status,
      value: referral.value,
    })
    setShowReferralGivenModal(true)
  }

  const handleEditReferralReceived = (referral: Referral) => {
    setEditReferralReceived({
      id: referral.id,
      fromUser: referral.fromUser?.id || '',
      toUser: referral.toUser?.id || '',
      date: referral.date,
      description: referral.description,
      status: referral.status,
      value: referral.value,
    })
    setShowReferralReceivedModal(true)
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards - all auto-calculated, not editable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ActivityStatsCard
          label={t('activities', 'receivedBusiness')}
          value={stats.receivedBusiness}
          prefix="€"
        />
        <ActivityStatsCard
          label={t('activities', 'receivedReferrals')}
          value={stats.receivedCount}
        />
        <ActivityStatsCard label={t('activities', 'givenReferrals')} value={stats.givenCount} />
        <ActivityStatsCard
          label={t('activities', 'givenBusiness')}
          value={stats.givenBusiness}
          prefix="€"
        />
      </div>

      {/* 1-2-1 Meetings Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink dark:text-surface-text">
            {t('activities', 'meetings')}
          </h2>
          <button
            onClick={() => {
              setEditMeeting(null)
              setShowMeetingModal(true)
            }}
            className="flex items-center justify-center w-8 h-8 bg-brand text-white rounded-full hover:bg-brand-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {meetings.length > 0 ? (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting as any}
                currentUserId={userId}
                onEdit={() => handleEditMeeting(meeting)}
              />
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
            {t('activities', 'noMeetings')}
          </p>
        )}
      </div>

      {/* Referrals Received Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink dark:text-surface-text">
            {t('activities', 'receivedReferralsTitle')} ({referralsReceived.length})
          </h2>
          <button
            onClick={() => {
              setEditReferralReceived(null)
              setShowReferralReceivedModal(true)
            }}
            className="flex items-center justify-center w-8 h-8 bg-brand text-white rounded-full hover:bg-brand-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {referralsReceived.length > 0 ? (
          <div className="space-y-4">
            {referralsReceived.map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral as any}
                currentUserId={userId}
                viewMode="received"
                onEdit={() => handleEditReferralReceived(referral)}
              />
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
            {t('activities', 'noReferrals')}
          </p>
        )}
      </div>

      {/* Referrals Given Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink dark:text-surface-text">
            {t('activities', 'givenReferralsTitle')} ({referralsGiven.length})
          </h2>
          <button
            onClick={() => {
              setEditReferralGiven(null)
              setShowReferralGivenModal(true)
            }}
            className="flex items-center justify-center w-8 h-8 bg-brand text-white rounded-full hover:bg-brand-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {referralsGiven.length > 0 ? (
          <div className="space-y-4">
            {referralsGiven.map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral as any}
                currentUserId={userId}
                viewMode="given"
                onEdit={() => handleEditReferralGiven(referral)}
              />
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
            {t('activities', 'noReferrals')}
          </p>
        )}
      </div>

      {/* Modals */}
      <OneToOneMeetingModal
        isOpen={showMeetingModal}
        onClose={() => {
          setShowMeetingModal(false)
          setEditMeeting(null)
        }}
        members={members}
        currentUserId={userId}
        editData={editMeeting}
      />

      <ReferralModal
        isOpen={showReferralGivenModal}
        onClose={() => {
          setShowReferralGivenModal(false)
          setEditReferralGiven(null)
        }}
        members={members}
        currentUserId={userId}
        mode="give"
        editData={editReferralGiven}
      />

      <ReferralModal
        isOpen={showReferralReceivedModal}
        onClose={() => {
          setShowReferralReceivedModal(false)
          setEditReferralReceived(null)
        }}
        members={members}
        currentUserId={userId}
        mode="receive"
        editData={editReferralReceived}
      />
    </div>
  )
}
