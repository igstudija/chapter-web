import Link from 'next/link'
import Image from 'next/image'

interface BlogCardProps {
  title: string
  excerpt?: string
  slug: string
  publishedAt?: string
  featuredImage?: {
    url: string
    alt: string
  }
  variant?: 'default' | 'homepage'
}

export function BlogCard({
  title,
  excerpt,
  slug,
  publishedAt,
  featuredImage,
  variant = 'default',
}: Readonly<BlogCardProps>) {
  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null

  return (
    <Link
      href={`/blog/${slug}`}
      className={`block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden group ${
        variant === 'homepage'
          ? 'dark:bg-surface dark:border dark:border-neutral-700'
          : 'dark:bg-neutral-800'
      }`}
    >
      {featuredImage && (
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={featuredImage.url}
            alt={featuredImage.alt}
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="p-6">
        {formattedDate && (
          <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">{formattedDate}</div>
        )}
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-surface-text group-hover:text-brand transition-colors">
          {title}
        </h3>
        {excerpt && (
          <p className="text-neutral-700 dark:text-neutral-300 mt-2 line-clamp-3">{excerpt}</p>
        )}
      </div>
    </Link>
  )
}
