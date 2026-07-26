import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin } from 'lucide-react'

interface EventCardProps {
  readonly title: string
  readonly date: string
  readonly location?: string
  readonly slug: string
  readonly timezone?: string
  readonly image?: { url: string; alt?: string }
  /**
   * `default` is the grid tile used on the events listing. `featured` is the
   * lead item on the homepage — same content, given the room it deserves.
   * `row` is the compact horizontal form the items beside a featured one take.
   */
  readonly variant?: 'default' | 'featured' | 'row'
}

export function EventCard({
  title,
  date,
  location,
  slug,
  timezone = 'Europe/Riga',
  image,
  variant = 'default',
}: EventCardProps) {
  const eventDate = new Date(date)
  const formattedDate = eventDate.toLocaleDateString('lv-LV', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: timezone,
  })
  const formattedTime = eventDate.toLocaleTimeString('lv-LV', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  })

  /**
   * The compact form. No card, no shadow — a ruled row, so a short list beside
   * a featured item reads as a schedule rather than as three more boxes.
   */
  if (variant === 'row') {
    return (
      <Link href={`/events/${slug}`} className="group flex gap-5 py-5">
        <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-900 sm:w-24">
          {image?.url ? (
            <Image
              src={image.url}
              alt={image.alt || title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="96px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Calendar className="h-6 w-6 text-white/30" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="tabular flex items-center gap-2 font-mono text-[11px] text-ink-soft dark:text-neutral-500">
            <span>{formattedDate}</span>
            <span className="h-2.5 w-px bg-line dark:bg-line-dark" aria-hidden="true" />
            <span>{formattedTime}</span>
          </div>
          <h3 className="mt-2 line-clamp-2 font-display text-base font-semibold leading-snug tracking-tight text-ink transition-colors group-hover:text-brand dark:text-surface-text">
            {title}
          </h3>
          {location && (
            <p className="mt-1.5 line-clamp-1 flex items-center gap-1.5 text-xs text-ink-soft dark:text-neutral-500">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              {location}
            </p>
          )}
        </div>
      </Link>
    )
  }

  const featured = variant === 'featured'

  return (
    <Link href={`/events/${slug}`} className="group block h-full">
      <article className="card-surface flex h-full flex-col overflow-hidden rounded-2xl">
        <div
          className={`relative overflow-hidden bg-neutral-100 dark:bg-neutral-900 ${
            featured ? 'aspect-16/10' : 'aspect-3/2'
          }`}
        >
          {image?.url ? (
            <Image
              src={image.url}
              alt={image.alt || title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              sizes={featured ? '(max-width: 1024px) 100vw, 55vw' : '(max-width: 768px) 100vw, 33vw'}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-900">
              <Calendar className="h-10 w-10 text-white/25" />
            </div>
          )}
          {/*
            The date used to sit in a solid brand-red bar under every image —
            six of them in a row on the events page, which is what made the
            grid read as a wall of red. It rides the image now on a dark plate,
            in the mono face the rest of the interface uses for data, so the
            figures line up column to column.
          */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2.5 rounded-lg bg-neutral-950/70 px-2.5 py-1.5 backdrop-blur-md">
            <span className="tabular font-mono text-xs font-medium text-white">
              {formattedDate}
            </span>
            <span className="h-3 w-px bg-white/30" aria-hidden="true" />
            <span className="tabular font-mono text-xs font-medium text-white/80">
              {formattedTime}
            </span>
          </div>
        </div>
        <div className={`flex flex-1 flex-col ${featured ? 'p-7 md:p-8' : 'p-5'}`}>
          <h3
            className={`font-display font-semibold leading-snug tracking-tight text-ink transition-colors group-hover:text-brand dark:text-surface-text ${
              featured ? 'text-2xl md:text-[1.75rem]' : 'text-base'
            }`}
          >
            {title}
          </h3>
          {location && (
            <p
              className={`mt-2 line-clamp-1 flex items-center gap-1.5 text-ink-soft dark:text-neutral-400 ${
                featured ? 'text-sm' : 'text-sm'
              }`}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {location}
            </p>
          )}
        </div>
      </article>
    </Link>
  )
}
