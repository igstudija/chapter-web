'use client'

import { Crown } from 'lucide-react'
import { getThumbnailUrl } from '@/lib/getThumbnailUrl'

interface Member {
  id: string
  name: string
  surname: string
  company: string
  profileImage?: { url?: string | null } | null
}

interface SpeechMasterCeremonySlideProps {
  speechMaster: Member
  title?: string | null
}

export function SpeechMasterCeremonySlide({
  speechMaster,
  title,
}: Readonly<SpeechMasterCeremonySlideProps>) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-white rounded-lg overflow-hidden">
      {/* Title with Crown */}
      <div className="flex items-center gap-4 mb-12">
        <Crown className="w-20 h-20 text-yellow-500 fill-yellow-500" />
        <h1
          className="font-bold text-neutral-800 text-center"
          style={{ fontSize: '64px' }}
        >
          {title || 'Runas Meistars'}
        </h1>
      </div>

      {/* Speech Master Profile */}
      <div className="flex flex-col items-center">
        {/* Profile Image */}
        <div className="relative mb-8" style={{ width: '400px', height: '400px' }}>
          {speechMaster.profileImage?.url ? (
            <img
              src={
                getThumbnailUrl(speechMaster.profileImage.url, 'medium') ||
                speechMaster.profileImage.url
              }
              alt={`${speechMaster.name} ${speechMaster.surname}`}
              className="w-full h-full rounded-2xl object-cover shadow-xl border-4 border-yellow-400"
            />
          ) : (
            <div className="w-full h-full rounded-2xl bg-neutral-200 flex items-center justify-center shadow-xl border-4 border-yellow-400">
              <span className="text-6xl font-bold text-neutral-400">
                {speechMaster.name.charAt(0)}
                {speechMaster.surname.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Name */}
        <h2
          className="font-bold text-neutral-800 text-center"
          style={{ fontSize: '48px' }}
        >
          {speechMaster.name} {speechMaster.surname}
        </h2>

        {/* Company */}
        <p
          className="text-neutral-500 text-center mt-2"
          style={{ fontSize: '32px' }}
        >
          {speechMaster.company}
        </p>
      </div>
    </div>
  )
}
