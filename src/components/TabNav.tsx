import Link from 'next/link'

export interface TabNavItem {
  readonly href: string
  readonly label: string
  readonly icon: React.ReactNode
  readonly active: boolean
  /** Omit entirely for tabs that do not count anything. */
  readonly count?: number
}

interface TabNavProps {
  readonly items: ReadonlyArray<TabNavItem>
  readonly ariaLabel: string
}

/**
 * The tab bar used by both the member's own profile and the public view of
 * another member's profile.
 *
 * Those two were separate implementations of the same control that had drifted
 * apart — one shouted its labels through `.toUpperCase()`, the other did not;
 * one hid labels below `sm`, the other wrapped onto three rows. Both painted
 * the active tab as a solid brand-red pill and the rest as bordered white
 * boxes, which is the single most dated thing in the member area: eight red
 * lozenges competing with each other and with the brand itself.
 *
 * One underlined bar instead. The active tab is marked by a rule in the brand
 * colour and darker text, the row scrolls sideways rather than wrapping, and
 * counts sit in the mono face like every other figure in the product.
 */
export function TabNav({ items, ariaLabel }: TabNavProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className="no-scrollbar mb-8 -mx-4 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0 dark:border-line-dark"
    >
      <ul className="flex min-w-max gap-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              title={item.label}
              className={`relative flex items-center gap-2 whitespace-nowrap px-3.5 py-3.5 text-sm font-medium transition-colors sm:px-4 ${
                item.active
                  ? 'text-brand'
                  : 'text-ink-soft hover:text-ink dark:text-neutral-400 dark:hover:text-surface-text'
              }`}
            >
              <span aria-hidden="true" className="shrink-0">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`tabular rounded px-1.5 py-0.5 font-mono text-[11px] ${
                    item.active
                      ? 'bg-brand/12 text-brand'
                      : 'bg-neutral-200/70 text-ink-soft dark:bg-neutral-800 dark:text-neutral-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
              {item.active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-brand"
                />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
