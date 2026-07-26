import Link from 'next/link'

export interface BreadcrumbItem {
  readonly label: string
  readonly href?: string
}

interface BreadcrumbProps {
  readonly items: ReadonlyArray<BreadcrumbItem>
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs">
        {items.map((item, index) => (
          <li key={item.href || item.label} className="flex items-center gap-2">
            {item.href ? (
              <Link
                href={item.href}
                className="text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink dark:text-surface-text">
                {item.label}
              </span>
            )}
            {index < items.length - 1 && (
              <span aria-hidden="true" className="text-neutral-400 dark:text-neutral-600">
                /
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
