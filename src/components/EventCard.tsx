import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock } from 'lucide-react'

interface EventCardProps {
  readonly title: string
  readonly date: string
  readonly location?: string
  readonly slug: string
  readonly timezone?: string
  readonly image?: { url: string; alt?: string }
}

export function EventCard({
  title,
  date,
  location,
  slug,
  timezone = 'Europe/Riga',
  image,
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

  return (
    <Link href={`/events/${slug}`} className="block group">
      <div className="rounded-lg overflow-hidden mb-3">
        <div className="relative aspect-[3/2] overflow-hidden">
          {image?.url ? (
            <Image
              src={image.url}
              alt={image.alt || title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center">
              <Calendar className="h-12 w-12 text-white/90" />
            </div>
          )}
        </div>
        <div className="bg-brand text-white px-3 py-2 flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formattedTime}
          </span>
        </div>
      </div>
      <h3 className="text-base font-semibold text-ink dark:text-surface-text group-hover:text-brand transition-colors line-clamp-2">
        {title}
      </h3>
    </Link>
  )
}
