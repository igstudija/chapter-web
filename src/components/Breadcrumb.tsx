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
    <nav className="text-sm mb-6">
      {items.map((item, index) => (
        <span key={item.href || item.label}>
          {item.href ? (
            <Link
              href={item.href}
              className="text-neutral-500 dark:text-neutral-400 hover:text-brand"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-ink dark:text-surface-text">{item.label}</span>
          )}
          {index < items.length - 1 && (
            <span className="mx-2 text-neutral-400 dark:text-neutral-500">›</span>
          )}
        </span>
      ))}
    </nav>
  )
}
