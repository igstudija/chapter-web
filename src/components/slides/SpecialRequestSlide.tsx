'use client'

import React from 'react'
import { getThumbnailUrl } from '@/lib/getThumbnailUrl'

interface SpecialRequestMember {
  id: string
  name: string
  surname: string
  company: string
  profileImage?: { url?: string | null } | null
  logo?: { url?: string | null } | null
  specialRequest?: string | null
}

/**
 * The member's ask, flashed over the middle of their own slide for the last few
 * seconds of their time.
 *
 * The permanent red bar spends a whole minute of screen on one line nobody is
 * reading yet; this spends none of it until the moment the member is wrapping
 * up, which is when the room is listening for what they want.
 */
export function SpecialRequestFlash({
  request,
  title,
}: {
  readonly request: string
  readonly title?: string | null
}) {
  const size = request.length > 120 ? 64 : request.length > 60 ? 84 : 104

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-24"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', animation: 'rise-in 320ms ease-out' }}
    >
      <div className="w-full max-w-[1500px] rounded-3xl bg-red-700 px-20 py-16 shadow-2xl">
        <p
          className="font-semibold uppercase text-white"
          style={{ fontSize: 30, letterSpacing: '0.22em', opacity: 0.75 }}
        >
          {title || 'Specifiskais prasījums'}
        </p>
        <p className="mt-8 font-bold text-white" style={{ fontSize: size, lineHeight: 1.1 }}>
          {request}
        </p>
      </div>
    </div>
  )
}

/**
 * The same ask, given the whole screen.
 *
 * As a strip along the bottom of a profile slide it competes with a portrait, a
 * name, contacts and two currency figures, and loses. Alone it is the only thing
 * to read — the one moment in the meeting where the room can act on it. Type
 * scales down as the request gets longer, so a two-word ask lands like a
 * headline and a long one still fits without scrolling.
 */
export function SpecialRequestSlide({
  member,
  title,
}: {
  readonly member: SpecialRequestMember
  /** Section label above the request, e.g. "Meklējam sadarbības partnerus". */
  readonly title?: string | null
}) {
  const request = member.specialRequest || ''
  const requestSize = request.length > 160 ? 78 : request.length > 80 ? 104 : 132

  return (
    <div className="relative flex h-full w-full flex-col justify-center overflow-hidden rounded-xl bg-red-700 px-24">
      {/* A soft off-centre glow rather than decoration that reads as a glyph —
          at 8% opacity an oversized quote mark just looked like two smudges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-52 h-[760px] w-[760px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.16), transparent 62%)' }}
      />

      <p
        className="font-semibold uppercase text-white"
        style={{ fontSize: 34, letterSpacing: '0.22em', opacity: 0.75 }}
      >
        {title || 'Meklēju'}
      </p>

      <p
        className="mt-10 font-bold text-white"
        style={{ fontSize: requestSize, lineHeight: 1.08 }}
      >
        {request}
      </p>

      <div className="mt-14 flex items-center gap-6">
        {member.profileImage?.url && (
          <img
            src={getThumbnailUrl(member.profileImage.url, 'thumbnail') || member.profileImage.url}
            alt=""
            aria-hidden
            className="h-[104px] w-[104px] rounded-2xl object-cover ring-4 ring-white/30"
          />
        )}
        <div>
          <p className="font-bold text-white" style={{ fontSize: 42 }}>
            {member.name} {member.surname}
          </p>
          <p className="text-white" style={{ fontSize: 32, opacity: 0.8 }}>
            {member.company}
          </p>
        </div>

        {member.logo?.url && (
          <div className="ml-auto rounded-xl bg-white p-4">
            <img
              src={member.logo.url}
              alt={member.company}
              className="h-20 w-20 object-contain"
              crossOrigin="anonymous"
            />
          </div>
        )}
      </div>
    </div>
  )
}
