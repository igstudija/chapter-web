'use client'

import React from 'react'
import { Mail, Phone, Globe, Crown } from 'lucide-react'
import { getThumbnailUrl } from '@/lib/getThumbnailUrl'
import en from 'react-phone-number-input/locale/en'
import { SlideMedia, memberSlideImages, useSlideImageCycle } from './SlideMedia'
import type { MemberSlideTemplate } from '@/lib/buildSlides'

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
  profileImage?: { url?: string | null } | null
  logo?: { url?: string | null } | null
  slideImage?: { url?: string | null } | null
  slideImages?: Array<{ url?: string | null }> | null
  slideMediaType?: 'image' | 'video' | null
  slideVideoUrl?: string | null
  slideTemplate?: MemberSlideTemplate | null
  slideBackgroundColor?: string | null
  slideBackgroundColorRight?: string | null
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
  businessTotal: string
}

interface MemberSlideProps {
  member: Member
  isSpeechMaster: boolean
  group?: PowerGroup
  /** Media only: no portrait, name, contacts, figures or special request. */
  hideMemberInfo?: boolean
  /** The request gets its own slide instead of the bar under the media. */
  hideSpecialRequest?: boolean
  /** Length of the full photo sequence; each photo gets `this / count`. */
  imageSeconds?: number
  showAttendanceIcon?: boolean
  overrideBackgroundColor?: string
  overrideBackgroundColorRight?: string
  overrideImageMode?: 'contain' | 'cover'
  overrideTemplate?: MemberSlideTemplate
  translations?: SlideshowTranslations
  businessGivenMin?: number
  businessReceivedMin?: number
}

// Default translations (fallback if not provided)
const defaultTranslations: SlideshowTranslations = {
  businessGiven: 'Business Given',
  businessReceived: 'Business Received',
  businessTotal: 'Total business',
}

// Format currency with non-breaking spaces
function formatCurrency(value: number | null | undefined): string {
  if (!value) return '0 €'
  return (
    new Intl.NumberFormat('lv-LV', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(value)
      .replaceAll(' ', ' ') + ' €'
  )
}

// Calculate text color based on background brightness
function getTextColor(bgColor: string): string {
  // Default to black text for white/light backgrounds
  if (!bgColor || bgColor === '#ffffff') return '#000000'

  const hex = bgColor.replace('#', '')

  /*
   * Only 6-digit hex parses here, and the colour field is free text — an admin
   * who types `#fff` used to get NaN through to the comparison below, which is
   * false for `NaN > 0.5`, so the slide fell back to white type. On a light
   * background that is a blank slide on the projector. Anything unparseable
   * falls back to black, which at least stays readable on the white default.
   */
  if (hex.length !== 6) return '#000000'

  const r = Number.parseInt(hex.substring(0, 2), 16)
  const g = Number.parseInt(hex.substring(2, 4), 16)
  const b = Number.parseInt(hex.substring(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return '#000000'

  // Relative luminance (perceived brightness)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

/** Height of the overlaid request bar — what content above it has to clear. */
const REQUEST_BAR_HEIGHT = 60

/** The member's slide colour at a given opacity, for scrims and overlays. */
function withAlpha(hex: string, alpha: number): string {
  const clean = (hex || '#000000').replace('#', '')
  if (clean.length !== 6) return `rgba(0, 0, 0, ${alpha})`
  const r = Number.parseInt(clean.substring(0, 2), 16)
  const g = Number.parseInt(clean.substring(2, 4), 16)
  const b = Number.parseInt(clean.substring(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return `rgba(0, 0, 0, ${alpha})`
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const isMeaningful = (value: string | null | undefined) =>
  !!value && value.trim() !== '' && value.trim() !== '-'

/** Shared context every template renders from — computed once in MemberSlide. */
interface TemplateContext {
  member: Member
  isSpeechMaster: boolean
  bgColor: string
  /** Classic's media side; equals `bgColor` unless the member split them. */
  bgColorRight: string
  textColor: string
  borderColor: string
  images: string[]
  mediaType: 'image' | 'video'
  imageMode: 'contain' | 'cover'
  imageCycleMs: number
  hideSpecialRequest: boolean
  /** The request bar is overlaid, so content above it needs to make room. */
  showRequestBar: boolean
  showBusinessGiven: boolean
  showBusinessReceived: boolean
  t: SlideshowTranslations
}

function ProfilePhoto({
  ctx,
  onDark = false,
  crownSize = 'w-16 h-16',
  logoSize = 'h-12 w-12',
}: {
  ctx: TemplateContext
  onDark?: boolean
  crownSize?: string
  logoSize?: string
}) {
  const { member, isSpeechMaster, textColor } = ctx
  const placeholderColor = onDark || textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const initialsColor = onDark ? '#ffffff' : textColor

  return (
    <div className="aspect-square relative h-full w-full">
      {member.profileImage?.url ? (
        <img
          src={getThumbnailUrl(member.profileImage.url, 'medium') || member.profileImage.url}
          alt={`${member.name} ${member.surname}`}
          className="aspect-square h-full w-full rounded-2xl object-cover"
        />
      ) : (
        <div
          className="aspect-square flex h-full w-full items-center justify-center rounded-2xl"
          style={{ backgroundColor: placeholderColor }}
        >
          <span className="text-6xl font-bold" style={{ color: initialsColor, opacity: 0.5 }}>
            {member.name.charAt(0)}
            {member.surname.charAt(0)}
          </span>
        </div>
      )}

      {isSpeechMaster && (
        <div className="absolute -top-6 -left-6">
          <Crown className={`${crownSize} text-yellow-500 fill-yellow-500`} />
        </div>
      )}

      {member.logo?.url && (
        <div className="absolute bottom-3 right-3 rounded-lg bg-white p-2 shadow-md">
          <div className={`relative ${logoSize}`}>
            <img
              key={`logo-${member.id}`}
              src={member.logo.url}
              alt={`${member.company} logo`}
              className="aspect-square h-full w-full object-contain"
              crossOrigin="anonymous"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Identity({
  ctx,
  color,
  align = 'center',
  nameSize = 40,
  metaSize = 30,
  shadow = false,
}: {
  ctx: TemplateContext
  color: string
  align?: 'center' | 'left'
  nameSize?: number
  metaSize?: number
  /** Insurance for type sitting straight on a photo, whatever its brightness. */
  shadow?: boolean
}) {
  const { member } = ctx
  const alignment = align === 'center' ? 'text-center' : 'text-left'
  const rowAlignment = align === 'center' ? 'justify-center' : 'justify-start'
  // A dark halo under dark type is a smudge; the shadow follows the type.
  const textShadow = shadow
    ? color === '#ffffff'
      ? '0 2px 18px rgba(0,0,0,0.55)'
      : '0 2px 18px rgba(255,255,255,0.65)'
    : undefined

  return (
    <div className={`w-full ${alignment}`} style={{ textShadow }}>
      <h2 className="font-bold leading-tight" style={{ fontSize: nameSize, color }}>
        {member.name} {member.surname}
      </h2>
      {/* Position and company hold to one line: wrapped, this reads as two
          stacked facts instead of one, and the column loses its shape. The
          size drops below the callers' metaSize to buy that room, and a
          truly endless title trims with an ellipsis rather than spilling
          out of the fixed 1920×1080 frame. */}
      <p
        className="leading-tight mt-1 max-w-full overflow-hidden whitespace-nowrap text-ellipsis"
        style={{ fontSize: metaSize * 0.72, color, opacity: 0.85 }}
      >
        {member.jobPosition &&
          member.jobPosition !== '-' &&
          member.jobPosition.toLowerCase() !== 'is' &&
          `${member.jobPosition}, `}
        {member.company}
      </p>
      {member.country && (
        <div
          className={`flex items-center gap-2 mt-1 ${rowAlignment}`}
          style={{ fontSize: metaSize * 0.8, color, opacity: 0.8 }}
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
    </div>
  )
}

/**
 * Height is reserved whether or not there is a request, so the media area keeps
 * the same 4:3 box for every member. Members without one used to get a bare red
 * stripe; now the reserved space simply stays empty.
 */
/**
 * Laid over the foot of the slide rather than given a row of its own — a row
 * costs every slide 50px of picture whether or not the member has a request.
 */
function SpecialRequestBar({
  text,
  hidden = false,
}: {
  text?: string | null
  /** Shown elsewhere — its own slide, the last-seconds flash, or not at all. */
  hidden?: boolean
}) {
  if (hidden || !text) return null
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center bg-red-700 px-8 py-3">
      <p className="truncate font-semibold text-white" style={{ fontSize: '20pt' }}>
        {text}
      </p>
    </div>
  )
}

function CompanyFallback({ ctx, color }: { ctx: TemplateContext; color: string }) {
  const { member } = ctx
  if (member.logo?.url) {
    return (
      <div className="relative h-64 w-64">
        <img
          key={`logo-large-${member.id}`}
          src={member.logo.url}
          alt={member.company}
          className="h-full w-full object-contain"
          crossOrigin="anonymous"
        />
      </div>
    )
  }
  return (
    <h3 className="text-4xl font-bold" style={{ color }}>
      {member.company}
    </h3>
  )
}

function SlideMediaFor(
  ctx: TemplateContext,
  fallbackColor: string,
  options: {
    displayMode?: 'contain' | 'cover'
    controlledIndex?: number
  } = {},
) {
  return (
    <SlideMedia
      images={ctx.images}
      videoUrl={ctx.member.slideVideoUrl}
      mediaType={ctx.mediaType}
      displayMode={options.displayMode ?? ctx.imageMode}
      cycleMs={ctx.imageCycleMs}
      alt={`${ctx.member.name} ${ctx.member.surname} — ${ctx.member.company}`}
      controlledIndex={options.controlledIndex}
      fallback={<CompanyFallback ctx={ctx} color={fallbackColor} />}
    />
  )
}

/**
 * Contacts as a row of chips instead of a stacked list — reads as one line of
 * information at a glance, which is what a room full of people gets.
 */
function ContactPills({
  ctx,
  color,
  chipColor,
  fontSize = 28,
  stack = false,
  align = 'center',
}: {
  ctx: TemplateContext
  color: string
  chipColor: string
  fontSize?: number
  /** One chip per line instead of a wrapping row. */
  stack?: boolean
  /** How stacked chips line up against the rest of the column. */
  align?: 'center' | 'left'
}) {
  const { member } = ctx
  const items: Array<{ key: string; icon: React.ReactNode; value: string }> = []
  if (member.email) {
    items.push({ key: 'email', icon: <Mail className="h-8 w-8 shrink-0" />, value: member.email })
  }
  if (member.phone) {
    items.push({ key: 'phone', icon: <Phone className="h-8 w-8 shrink-0" />, value: member.phone })
  }
  if (isMeaningful(member.website)) {
    items.push({
      key: 'web',
      icon: <Globe className="h-8 w-8 shrink-0" />,
      value: member.website as string,
    })
  }
  if (items.length === 0) return null

  return (
    <div
      className={`flex gap-4 ${
        stack
          ? `flex-col ${align === 'left' ? 'items-start' : 'items-center'}`
          : 'flex-wrap items-center'
      }`}
      style={{ fontSize, color }}
    >
      {items.map((item) => (
        <span
          key={item.key}
          className="flex items-center gap-3 rounded-full px-6 py-3"
          style={{ backgroundColor: chipColor }}
        >
          {item.icon}
          <span className="whitespace-nowrap">{item.value}</span>
        </span>
      ))}
    </div>
  )
}

/** Business figures sized to be read from the back of the room. */
function HeroStats({
  ctx,
  color,
  borderColor,
  valueSize = 54,
  labelSize = 20,
}: {
  ctx: TemplateContext
  color: string
  borderColor: string
  valueSize?: number
  labelSize?: number
}) {
  const { member, showBusinessGiven, showBusinessReceived, t } = ctx
  if (!showBusinessGiven && !showBusinessReceived) return null

  const cells: Array<{ key: string; label: string; value: number | null | undefined }> = []
  if (showBusinessGiven) {
    cells.push({ key: 'given', label: t.businessGiven, value: member.tyfcbGiven })
  }
  if (showBusinessReceived) {
    cells.push({ key: 'received', label: t.businessReceived, value: member.tyfcbReceived })
  }

  return (
    <div className="flex items-stretch">
      {cells.map((cell, index) => (
        <div
          key={cell.key}
          className={index > 0 ? 'border-l pl-10 ml-10' : ''}
          style={{ borderColor }}
        >
          <p
            className="font-semibold uppercase"
            style={{ fontSize: labelSize, letterSpacing: '0.08em', color, opacity: 0.6 }}
          >
            {cell.label}
          </p>
          <p className="font-bold leading-none mt-2" style={{ fontSize: valueSize, color }}>
            {formatCurrency(cell.value)}
          </p>
        </div>
      ))}
    </div>
  )
}

/**
 * Profile column on the left, 4:3 media column on the right — the original
 * arrangement, re-proportioned.
 *
 * The old version stacked its content under a fixed top padding and pushed the
 * figures to the floor with `justify-between`, which left a hole in the middle
 * of the column on almost every member. Here the four zones are sized to fill
 * the column outright: a large portrait, the name, contact chips, then the
 * figures above a hairline, with the only slack absorbed just before the rule.
 */
function ClassicTemplate({ ctx }: { ctx: TemplateContext }) {
  const { member, bgColor, textColor, borderColor } = ctx
  const chipColor = textColor === '#ffffff' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.055)'

  return (
    <div className="relative flex h-full w-full">
      {/* Left Column — takes whatever the 4:3 picture leaves. */}
      <div
        className="flex min-w-0 flex-1 flex-col items-center overflow-hidden px-10 pt-10"
        style={{
          backgroundColor: bgColor,
          paddingBottom: 40 + (ctx.showRequestBar ? REQUEST_BAR_HEIGHT : 0),
        }}
      >
        {/* Sized so portrait + name + contacts + figures fill the column
            outright — the four zones use it up, nothing floats. */}
        <div className="w-[290px] shrink-0">
          <ProfilePhoto ctx={ctx} logoSize="h-14 w-14" />
        </div>

        <div className="mt-8 w-full">
          <Identity ctx={ctx} color={textColor} nameSize={52} metaSize={32} />
        </div>

        <div className="mt-8 w-full">
          <ContactPills ctx={ctx} color={textColor} chipColor={chipColor} fontSize={27} stack />
        </div>

        {/* Whatever height is left over collects here, in one place. */}
        <div className="min-h-0 flex-1" />

        {/* The hairline belongs to the figures, not the column: a member whose
            numbers sit under the chapter minimum renders no HeroStats, and a
            rule over nothing reads as a mistake at the bottom of the slide. */}
        {(ctx.showBusinessGiven || ctx.showBusinessReceived) && (
          <div className="mt-8 flex w-full justify-center border-t pt-8" style={{ borderColor }}>
            {/* Sized to survive seven-digit figures: at 44/20 a member with a
                million-euro year ran the pair off both edges of the column. */}
            <HeroStats
              ctx={ctx}
              color={textColor}
              borderColor={borderColor}
              valueSize={34}
              labelSize={15}
            />
          </div>
        )}
      </div>

      {/*
        Right Column - the media fills it, and its width is pinned to the 4:3 it
        would be with the request bar showing. Deriving the width from the bar's
        actual state instead made the profile column jump sideways the moment a
        member turned their request on or off; holding the column steady and
        letting the picture take the extra 60px is the lesser of the two.
      */}
      <div
        className="relative flex h-full shrink-0 overflow-hidden"
        style={{ backgroundColor: ctx.bgColorRight }}
      >
        {/* Sets the column width and nothing else: a 4:3 box the height of the
            media area when the bar is present. */}
        <div
          aria-hidden
          className="invisible"
          style={{ height: `calc(100% - ${REQUEST_BAR_HEIGHT}px)`, aspectRatio: '4 / 3' }}
        />
        {/* The media stops where the request bar starts, so with the bar up the
            picture area is exactly the 4:3 the column was sized for instead of
            having its bottom 60px covered. */}
        <div
          className="absolute inset-x-0 top-0 flex items-center justify-center overflow-hidden"
          style={{ bottom: ctx.showRequestBar ? REQUEST_BAR_HEIGHT : 0 }}
        >
          {SlideMediaFor(ctx, getTextColor(ctx.bgColorRight))}
        </div>
      </div>

      <SpecialRequestBar text={member.specialRequest} hidden={ctx.hideSpecialRequest} />
    </div>
  )
}

/**
 * Cinematic layout: media fills the frame and everything else is anchored to
 * the bottom over a rising scrim — the shape a title card takes, rather than a
 * card parked on top of a picture.
 */
function CoverTemplate({ ctx }: { ctx: TemplateContext }) {
  const { member, bgColor, bgColorRight } = ctx
  // The scrim is the member's own slide colour, so the overlay reads as part of
  // their design rather than a black bar the system dropped on it. Type and
  // trim follow from it the same way they do everywhere else.
  const panelText = getTextColor(bgColor)
  const onDark = panelText === '#ffffff'
  const trim = onDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'
  const chip = onDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)'

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      /* Two colours, the same pair Classic uses: the media sits on the second
         one, and the scrim below carries the first. A contained photo leaves
         the rest of the canvas bare and this is what shows through it. */
      style={{ backgroundColor: bgColorRight }}
    >
      <div className="absolute inset-0">
        {SlideMediaFor(ctx, getTextColor(bgColorRight), {
          displayMode: ctx.mediaType === 'video' ? 'cover' : ctx.imageMode,
        })}
      </div>

        {/* Scrim: opaque enough across the text zone to carry type over a busy
            photo, gone by just past halfway so the picture keeps the rest. Every
            stop is the earlier ramp scaled to two-thirds of its height. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${withAlpha(bgColor, 0.95)} 0%, ${withAlpha(
              bgColor,
              0.88,
            )} 16%, ${withAlpha(bgColor, 0.64)} 27%, ${withAlpha(bgColor, 0.24)} 37%, ${withAlpha(
              bgColor,
              0.03,
            )} 48%, transparent 55%)`,
          }}
        />

        <div
          className="absolute inset-x-0 bottom-0 px-14"
          style={{ paddingBottom: 48 + (ctx.showRequestBar ? REQUEST_BAR_HEIGHT : 0) }}
        >
          <div className="flex items-end gap-10">
            <div
              className="h-[240px] w-[240px] shrink-0 rounded-2xl ring-4"
              style={{ '--tw-ring-color': trim } as React.CSSProperties}
            >
              <ProfilePhoto ctx={ctx} onDark={onDark} crownSize="w-14 h-14" logoSize="h-11 w-11" />
            </div>

            <div className="min-w-0 flex-1 pb-2">
              <Identity
                ctx={ctx}
                color={panelText}
                align="left"
                nameSize={76}
                metaSize={38}
                shadow
              />
            </div>

            <div className="shrink-0 pb-3">
              <HeroStats ctx={ctx} color={panelText} borderColor={trim} valueSize={58} />
            </div>
          </div>

          <div className="mt-8">
            <ContactPills ctx={ctx} color={panelText} chipColor={chip} fontSize={27} />
          </div>
        </div>

      <SpecialRequestBar text={member.specialRequest} hidden={ctx.hideSpecialRequest} />
    </div>
  )
}

/**
 * Classic's column, Cover's canvas: the media runs edge to edge behind
 * everything, and the profile sits on it as a layer down the left — a panel of
 * type over the picture rather than a second box beside it.
 *
 * The photo sequence's segment bar lives at the foot of that panel, so it is
 * read together with the person rather than floating loose on the artwork.
 */
/** Width of the Reels information layer; the picture centres beside it. */
const PANEL_WIDTH = 760

function ReelsTemplate({ ctx }: { ctx: TemplateContext }) {
  const { member, bgColor, bgColorRight } = ctx
  // The scrim is the member's slide colour, so type and trim follow from it.
  const panelText = getTextColor(bgColor)
  const onDark = panelText === '#ffffff'
  const panelBorder = onDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.22)'
  const isVideo = ctx.mediaType === 'video'
  // The panel drives the sequence so its indicator and the picture stay in
  // step; SlideMedia takes the index instead of running a second timer.
  const cycle = useSlideImageCycle(
    ctx.mediaType === 'video' ? [] : ctx.images,
    ctx.imageCycleMs,
  )

  return (
    <div className="h-full w-full">
      <div
        className="relative h-full w-full overflow-hidden"
        /* Same pair as Classic and Cover: the picture sits on the second
           colour, the panel scrim below carries the first. */
        style={{ backgroundColor: bgColorRight }}
      >
        {isVideo ? (
          /*
            Video runs edge to edge under everything else. Boxing it into the
            space beside the panel — the arrangement stills use — left the
            player letterboxing itself inside that box, so the slide showed a
            small picture framed in black instead of a background.
          */
          <div className="absolute inset-0">
            {SlideMediaFor(ctx, getTextColor(bgColorRight), {
              displayMode: 'cover',
            })}
          </div>
        ) : ctx.imageMode === 'cover' ? (
          /*
            Cover fills the whole canvas. Holding the picture in the strip
            beside the panel — what contain does — would crop it twice, so the
            strip is dropped and the scrim alone separates picture from panel.
          */
          <div className="absolute inset-0">
            {SlideMediaFor(ctx, getTextColor(bgColorRight), {
              displayMode: 'cover',
              controlledIndex: cycle.activeIndex,
            })}
          </div>
        ) : (
          <>
            {/*
              The picture is centred in the space the panel leaves, not in the
              slide. Centring it on the slide put half of a vertical shot behind
              the scrim, which is the one thing this template avoids. What the
              picture does not cover is the media colour.
            */}
            <div className="absolute inset-y-0 right-0" style={{ left: PANEL_WIDTH }}>
              {SlideMediaFor(ctx, getTextColor(bgColorRight), {
                displayMode: 'contain',
                controlledIndex: cycle.activeIndex,
              })}
            </div>
          </>
        )}

        {/* Scrim: opaque under the panel, gone by the middle of the frame. Its
            colour is the member's slide colour, same as Cover's. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${withAlpha(bgColor, 0.92)} 0%, ${withAlpha(
              bgColor,
              0.86,
            )} 26%, ${withAlpha(bgColor, 0.55)} 40%, ${withAlpha(
              bgColor,
              0.15,
            )} 54%, transparent 68%)`,
          }}
        />

        <div
          className="absolute inset-y-0 left-0 flex flex-col justify-between px-16 pt-14"
          style={{
            width: PANEL_WIDTH,
            paddingBottom: 56 + (ctx.showRequestBar ? REQUEST_BAR_HEIGHT : 0),
          }}
        >
          <div className="flex flex-col gap-9">
            <div className="h-[250px] w-[250px]">
              <ProfilePhoto ctx={ctx} onDark={onDark} crownSize="w-16 h-16" logoSize="h-12 w-12" />
            </div>
            <Identity
              ctx={ctx}
              color={panelText}
              align="left"
              nameSize={64}
              metaSize={34}
              shadow
            />
          </div>

          <ContactPills
            ctx={ctx}
            color={panelText}
            chipColor={onDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)'}
            fontSize={28}
            stack
            align="left"
          />

          <HeroStats ctx={ctx} color={panelText} borderColor={panelBorder} valueSize={52} />
        </div>

        {/* Overlaid rather than given its own row: a row would shorten the
            canvas, and the whole point here is that nothing crops the media. */}
        <div className="absolute inset-x-0 bottom-0">
          <SpecialRequestBar text={member.specialRequest} hidden={ctx.hideSpecialRequest} />
        </div>
      </div>
    </div>
  )
}

/**
 * Media filling the whole slide, nothing else — what the "slides without member
 * info" checkbox produces. The member is in the room presenting; the profile
 * furniture is what gets in the way.
 */
function MediaOnlyTemplate({ ctx }: { ctx: TemplateContext }) {
  const { bgColorRight } = ctx

  // The whole slide is the media side here, so it takes the media colour.
  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-hidden"
      style={{ backgroundColor: bgColorRight }}
    >
      {SlideMediaFor(ctx, getTextColor(bgColorRight))}
    </div>
  )
}

export function MemberSlide({
  member,
  isSpeechMaster,
  hideMemberInfo = false,
  hideSpecialRequest = false,
  imageSeconds = 30,
  overrideBackgroundColor,
  overrideBackgroundColorRight,
  overrideImageMode,
  overrideTemplate,
  translations = defaultTranslations,
  businessGivenMin = 0,
  businessReceivedMin = 0,
}: MemberSlideProps) {
  // Slide settings — overrides let the presentation editor preview live edits.
  const bgColor = overrideBackgroundColor || member.slideBackgroundColor || '#ffffff'
  const bgColorRight =
    overrideBackgroundColorRight || member.slideBackgroundColorRight || bgColor
  const imageMode = overrideImageMode || member.slideImageMode || 'contain'
  const template = overrideTemplate || member.slideTemplate || 'classic'
  const textColor = getTextColor(bgColor)

  const ctx: TemplateContext = {
    member,
    isSpeechMaster,
    bgColor,
    bgColorRight,
    textColor,
    borderColor: textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
    images: memberSlideImages(member),
    mediaType: member.slideMediaType === 'video' ? 'video' : 'image',
    imageMode,
    imageCycleMs: Math.max(imageSeconds, 2) * 1000,
    hideSpecialRequest,
    showRequestBar: !hideSpecialRequest && !!member.specialRequest,
    showBusinessGiven: (member.tyfcbGiven ?? 0) >= businessGivenMin,
    showBusinessReceived: (member.tyfcbReceived ?? 0) >= businessReceivedMin,
    t: translations,
  }

  // Set per slide block in Slideshow settings; overrides the member's template.
  if (hideMemberInfo) return <MediaOnlyTemplate ctx={ctx} />
  if (template === 'cover') return <CoverTemplate ctx={ctx} />
  if (template === 'reels') return <ReelsTemplate ctx={ctx} />
  return <ClassicTemplate ctx={ctx} />
}
