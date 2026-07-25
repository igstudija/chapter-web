'use client'

import React from 'react'
import { Mail, Phone, Globe, Crown } from 'lucide-react'
import { getThumbnailUrl } from '@/lib/getThumbnailUrl'
import en from 'react-phone-number-input/locale/en'

const countryNames = en as Record<string, string>

// Flag image URL via Twemoji CDN (same approach as PhoneInput / CountrySelect)
function countryFlagUrl(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => (127397 + char.charCodeAt(0)).toString(16))
    .join('-')
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoints}.svg`
}

interface Member {
  id: string
  name: string
  surname: string
  company: string
  jobPosition?: string | null
  email: string
  phone?: string | null
  website?: string | null
  country?: string | null
  tyfcbGiven?: number | null
  tyfcbReceived?: number | null
  activityGiven?: number | null
  activityReceived?: number | null
  profileImage?: { url?: string | null } | null
  logo?: { url?: string | null } | null
  slideImage?: { url?: string | null } | null
  slideBackgroundColor?: string | null
  slideImageMode?: 'contain' | 'cover' | null
  specialRequest?: string | null
  attendanceType?: 'onsite' | 'online' | null
}

interface PowerGroup {
  id: string
  title: string
}

interface SlideshowTranslations {
  businessGiven: string
  businessReceived: string
  fromActivities: string
  businessTotal: string
}

interface MemberSlideProps {
  member: Member
  isSpeechMaster: boolean
  group?: PowerGroup
  showAttendanceIcon?: boolean
  overrideBackgroundColor?: string
  overrideImageMode?: 'contain' | 'cover'
  enableActivities?: boolean
  translations?: SlideshowTranslations
  businessGivenMin?: number
  businessReceivedMin?: number
}

// Default translations (fallback if not provided)
const defaultTranslations: SlideshowTranslations = {
  businessGiven: 'Business Given',
  businessReceived: 'Business Received',
  fromActivities: 'From Activities',
  businessTotal: 'Total business',
}

export function MemberSlide({
  member,
  isSpeechMaster,
  group,
  showAttendanceIcon = false,
  overrideBackgroundColor,
  overrideImageMode,
  translations = defaultTranslations,
  businessGivenMin = 0,
  businessReceivedMin = 0,
}: MemberSlideProps) {
  const t = translations
  const showBusinessGiven = (member.tyfcbGiven ?? 0) >= businessGivenMin
  const showBusinessReceived = (member.tyfcbReceived ?? 0) >= businessReceivedMin
  const [imageAspectRatio, setImageAspectRatio] = React.useState<number | null>(null)

  // Format currency with non-breaking spaces
  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '0 €'
    return (
      new Intl.NumberFormat('lv-LV', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
        .format(value)
        .replaceAll(' ', '\u00A0') + '\u00A0€'
    )
  }

  // Calculate text color based on background brightness
  const getTextColor = (bgColor: string): string => {
    // Default to black text for white/light backgrounds
    if (!bgColor || bgColor === '#ffffff') return '#000000'

    // Remove # if present
    const hex = bgColor.replace('#', '')

    // Convert to RGB
    const r = Number.parseInt(hex.substring(0, 2), 16)
    const g = Number.parseInt(hex.substring(2, 4), 16)
    const b = Number.parseInt(hex.substring(4, 6), 16)

    // Calculate relative luminance (perceived brightness)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    // Return white text for dark backgrounds, black for light
    return luminance > 0.5 ? '#000000' : '#ffffff'
  }

  // Get slide settings - use override values if provided for real-time preview
  const bgColor = overrideBackgroundColor || member.slideBackgroundColor || '#ffffff'
  const imageMode = overrideImageMode || member.slideImageMode || 'contain'
  const textColor = getTextColor(bgColor)

  // Calculate 4:3 aspect ratio width based on available height
  // Available height in SVG viewBox: 1080 - 60 (bottom bar) - 4 (progress bar) = 1016
  // Special request bar height: 50px (always reserved)
  const specialRequestHeight = 50
  const availableImageHeight = 1016 - specialRequestHeight
  // For 4:3 ratio: width = height * 4/3
  // 966 * 4/3 = 1288px
  const rightColumnWidth = availableImageHeight * (4 / 3)

  // Check if image aspect ratio is 4:3 (with tolerance)
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const ratio = img.naturalWidth / img.naturalHeight
    setImageAspectRatio(ratio)
  }

  // Check if ratio is close to 4:3 (1.333) with 5% tolerance
  const targetRatio = 4 / 3 // 1.333
  const tolerance = 0.05
  const is43Ratio =
    imageAspectRatio !== null && Math.abs(imageAspectRatio - targetRatio) <= tolerance

  // Determine image classes based on aspect ratio
  const imageClasses = is43Ratio ? 'w-full h-auto' : 'max-w-full max-h-full'

  // Render slide content based on available media
  const renderSlideContent = () => {
    if (member.slideImage?.url) {
      return (
        <img
          src={member.slideImage.url}
          alt="Presentation slide"
          className={imageMode === 'cover' ? 'w-full h-full object-cover' : imageClasses}
          onLoad={handleImageLoad}
        />
      )
    }

    if (member.logo?.url) {
      return (
        <div className="relative w-64 h-64">
          <img
            key={`logo-large-${member.id}`}
            src={member.logo.url}
            alt={member.company}
            className="w-full h-full object-contain"
            crossOrigin="anonymous"
          />
        </div>
      )
    }

    return (
      <h3 className="text-4xl font-bold" style={{ color: textColor }}>
        {member.company}
      </h3>
    )
  }

  return (
    <div className="flex h-full w-full gap-3">
      {/* Left Column - Profile Info */}
      <div
        className="flex-1 flex flex-col items-center justify-between rounded-md border-r p-8"
        style={{
          backgroundColor: bgColor,
          borderColor: textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
        }}
      >
        <div className="flex flex-col items-center space-y-6 pt-20" style={{ width: '95%' }}>
          {/* Profile Image with Logo overlay */}
          <div className="aspect-square relative w-[50%]">
            {member.profileImage?.url ? (
              <img
                src={getThumbnailUrl(member.profileImage.url, 'medium') || member.profileImage.url}
                alt={`${member.name} ${member.surname}`}
                className="aspect-square w-full h-full rounded-2xl object-cover"
              />
            ) : (
              <div
                className="aspect-square w-full rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor:
                    textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                }}
              >
                <span className="text-6xl font-bold" style={{ color: textColor, opacity: 0.5 }}>
                  {member.name.charAt(0)}
                  {member.surname.charAt(0)}
                </span>
              </div>
            )}

            {/* Speech Master Crown */}
            {isSpeechMaster && (
              <div className="absolute -top-6 -left-6">
                <Crown className="w-16 h-16 text-yellow-500 fill-yellow-500" />
              </div>
            )}

            {/* Company Logo overlay */}
            {member.logo?.url && (
              <div className="absolute bottom-3 right-3 rounded-lg bg-white p-2 shadow-md">
                <div className="relative h-12 w-12">
                  <img
                    key={`logo-${member.id}`}
                    src={member.logo.url}
                    alt={`${member.company} logo`}
                    className="w-full h-full object-contain aspect-square"
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Name & Info */}
          <div className="w-full text-center">
            <h2 className="font-bold leading-tight" style={{ fontSize: '40px', color: textColor }}>
              {member.name} {member.surname}
            </h2>
            <p
              className="leading-tight mt-1"
              style={{ fontSize: '30px', color: textColor, opacity: 0.8 }}
            >
              {member.jobPosition &&
                member.jobPosition !== '-' &&
                member.jobPosition.toLowerCase() !== 'is' &&
                `${member.jobPosition}, `}
              {member.company}
            </p>
            {member.country && (
              <div
                className="flex items-center justify-center gap-2 mt-1"
                style={{ fontSize: '24px', color: textColor, opacity: 0.8 }}
              >
                <img
                  src={countryFlagUrl(member.country)}
                  alt={member.country}
                  className="h-8 w-11 object-contain"
                  loading="lazy"
                  crossOrigin="anonymous"
                />
                <span>{countryNames[member.country] || member.country}</span>
              </div>
            )}

            {/* Contact Info */}
            <div className="mt-10 space-y-3" style={{ fontSize: '27px' }}>
              {member.email && (
                <div className="flex items-center justify-center space-x-2">
                  <Mail className="h-8 w-8" style={{ color: textColor, opacity: 0.8 }} />
                  <span className="truncate" style={{ color: textColor }}>
                    {member.email}
                  </span>
                </div>
              )}
              {member.phone && (
                <div className="flex items-center justify-center space-x-2">
                  <Phone className="h-8 w-8" style={{ color: textColor, opacity: 0.8 }} />
                  <span style={{ color: textColor }}>{member.phone}</span>
                </div>
              )}
              {member.website && member.website.trim() !== '' && member.website.trim() !== '-' && (
                <div className="flex items-center justify-center space-x-2">
                  <Globe className="h-6 w-6" style={{ color: textColor, opacity: 0.8 }} />
                  <span
                    className="max-w-[380px] break-words whitespace-normal"
                    style={{ color: textColor }}
                  >
                    {member.website}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TYFCB Stats — rows below the site's minimum threshold are hidden */}
        <div className="space-y-3 rounded-lg p-4" style={{ width: '95%' }}>
          {/* Business Given */}
          {showBusinessGiven && (
            <div className="flex items-center justify-between">
              <p
                className="flex items-center space-x-2 font-semibold uppercase"
                style={{ fontSize: '20px', color: textColor, opacity: 0.7 }}
              >
                {t.businessGiven}
              </p>
              <div className="text-right text-2xl" style={{ color: textColor }}>
                <p className="font-bold">{formatCurrency(member.tyfcbGiven)}</p>
              </div>
            </div>
          )}
          {/* Business Received */}
          {showBusinessReceived && (
            <div
              className={`flex items-center justify-between ${showBusinessGiven ? 'border-t pt-3' : ''}`}
              style={{
                borderColor: textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
              }}
            >
              <p
                className="flex items-center space-x-2 font-semibold uppercase"
                style={{ fontSize: '20px', color: textColor, opacity: 0.7 }}
              >
                {t.businessReceived}
              </p>
              <div className="text-right" style={{ color: textColor }}>
                <p className="font-bold text-2xl">{formatCurrency(member.tyfcbReceived)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Slide Image with 4:3 aspect ratio */}
      <div
        className="flex h-full min-h-0 flex-col gap-2"
        style={{ width: rightColumnWidth, flexShrink: 0 }}
      >
        {/* Main Slide Image Area - fills 4:3 container */}
        <div
          className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md"
          style={{ backgroundColor: bgColor }}
        >
          {renderSlideContent()}
        </div>

        {/* Special Request Bar - Always shown to maintain 4:3 ratio */}
        <div
          className="rounded-md bg-red-700 px-4 py-3 flex items-center"
          style={{ height: '50px', flexShrink: 0 }}
        >
          {member.specialRequest && (
            <p className="text-white truncate font-semibold" style={{ fontSize: '20pt' }}>
              {member.specialRequest}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
