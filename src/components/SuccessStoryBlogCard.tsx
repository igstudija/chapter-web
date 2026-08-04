import Link from 'next/link'
import Image from 'next/image'
import { CompanyLogo } from '@/components/CompanyLogo'

interface SuccessStoryBlogCardProps {
  id: string
  title: string
  excerpt: string
  businessValue?: string | null
  createdAt: string
  author: {
    name: string
    surname: string
    company: string
    profileImageUrl?: string | null
    logoUrl?: string | null
  }
}

export function SuccessStoryBlogCard({
  id,
  title,
  excerpt,
  businessValue,
  createdAt,
  author,
}: Readonly<SuccessStoryBlogCardProps>) {
  const formattedDate = new Date(createdAt).toLocaleDateString('lv-LV', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <Link
      href={`/success-stories/${id}`}
      className="block card-surface overflow-hidden group"
    >
      {/* Image area with profile + logo */}
      <div className="relative h-48 bg-gradient-to-br from-brand/10 to-brand/5 dark:from-brand/20 dark:to-neutral-900">
        {/* Profile image */}
        <div className="absolute inset-0 flex items-center justify-center">
          {author.profileImageUrl ? (
            <Image
              src={author.profileImageUrl}
              alt={`${author.name} ${author.surname}`}
              width={120}
              height={120}
              className="rounded-full object-cover w-28 h-28 border-4 border-white dark:border-neutral-700 shadow-lg group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-28 h-28 bg-brand rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-neutral-700 shadow-lg">
              {author.name?.charAt(0)}
              {author.surname?.charAt(0)}
            </div>
          )}
        </div>

        {/* Company logo in bottom right corner */}
        {author.logoUrl && (
          <div className="absolute bottom-3 right-3 bg-white dark:bg-neutral-700 rounded-lg p-1.5 shadow-md">
            <CompanyLogo src={author.logoUrl} alt={author.company} width={60} height={32} />
          </div>
        )}

        {/* Business value badge */}
        {businessValue && (
          <div className="absolute top-3 left-3 bg-brand text-white text-sm font-semibold px-3 py-1 rounded-full shadow-md">
            {businessValue}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">{formattedDate}</div>
        <h3 className="text-lg font-semibold text-ink dark:text-surface-text group-hover:text-brand transition-colors line-clamp-2">
          {title}
        </h3>
        <p className="text-neutral-600 dark:text-neutral-300 mt-2 text-sm line-clamp-2">
          {excerpt}
        </p>
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            <span className="font-medium text-ink dark:text-surface-text">
              {author.name} {author.surname}
            </span>
            <span className="mx-1">•</span>
            {author.company}
          </p>
        </div>
      </div>
    </Link>
  )
}
