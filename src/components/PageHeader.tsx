import Link from 'next/link'

export interface PageHeaderCrumb {
  readonly label: string
  readonly href?: string
}

interface PageHeaderProps {
  readonly title: string
  /** Small mono label above the title. Usually the section this page sits in. */
  readonly eyebrow?: string
  /** One or two sentences under the title. Kept to a readable measure. */
  readonly lead?: string
  readonly breadcrumbs?: ReadonlyArray<PageHeaderCrumb>
  /** A primary action or filter rendered to the right of the title on desktop. */
  readonly action?: React.ReactNode
}

/**
 * The masthead every listing page opens with.
 *
 * Each page used to hand-roll its own breadcrumb markup and heading, which is
 * why they had drifted apart — three different breadcrumb separators, titles
 * at `text-3xl` on one page and `text-4xl` on the next, some shouted through
 * `.toUpperCase()` and some not. One component means one answer, and the
 * hairline it closes on is the same device the homepage sections use.
 */
export function PageHeader({ title, eyebrow, lead, breadcrumbs, action }: PageHeaderProps) {
  return (
    <header className="border-b border-line bg-card dark:border-line-dark dark:bg-surface-raised">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 md:pb-16 md:pt-10 lg:px-8">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs">
              {breadcrumbs.map((crumb, index) => (
                <li key={crumb.href || crumb.label} className="flex items-center gap-2">
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current="page"
                      className="text-ink dark:text-surface-text"
                    >
                      {crumb.label}
                    </span>
                  )}
                  {index < breadcrumbs.length - 1 && (
                    <span aria-hidden="true" className="text-neutral-400 dark:text-neutral-600">
                      /
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="max-w-2xl">
            {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
            <h1 className="display-page text-ink dark:text-surface-text">{title}</h1>
            {lead && (
              <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-ink-soft dark:text-neutral-400">
                {lead}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
    </header>
  )
}
