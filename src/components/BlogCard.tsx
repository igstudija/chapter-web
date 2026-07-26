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
    <Link href={`/blog/${slug}`} className="group block">
      <article className="card-surface flex h-full flex-col overflow-hidden">
        {featuredImage && (
          <div className="relative aspect-16/10 overflow-hidden bg-neutral-100 dark:bg-neutral-900">
            <Image
              src={featuredImage.url}
              alt={featuredImage.alt}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              sizes={variant === 'homepage' ? '(max-width: 768px) 100vw, 33vw' : '(max-width: 768px) 100vw, 50vw'}
            />
          </div>
        )}
        <div className="flex flex-1 flex-col p-6">
          {formattedDate && (
            <time
              dateTime={publishedAt}
              className="tabular mb-3 font-mono text-xs text-ink-soft dark:text-neutral-500"
            >
              {formattedDate}
            </time>
          )}
          <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-ink transition-colors group-hover:text-brand dark:text-surface-text">
            {title}
          </h3>
          {excerpt && (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-soft dark:text-neutral-400">
              {excerpt}
            </p>
          )}
        </div>
      </article>
    </Link>
  )
}
