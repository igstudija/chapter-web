'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { CompanyLogo } from './CompanyLogo'

export interface DirectoryCompany {
  id: string
  href: string
  company: string
  person: string
  role: string
  logoUrl: string | null
  logoAlt: string
}

export interface DirectoryGroup {
  id: string
  title: string
  companies: DirectoryCompany[]
}

/** Lower-case and without diacritics, so "gramatvede" finds "Grāmatvede". */
const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/**
 * The member directory a prospect actually uses: "is there a lawyer here?".
 *
 * It used to be a wall of greyed-out logos with no names, so the only way to
 * find a profession was to hover every tile. Each tile now carries the company
 * and the person, and the wall can be searched and narrowed to one sector.
 */
export function CompaniesDirectory({
  groups,
  labels,
}: {
  readonly groups: DirectoryGroup[]
  readonly labels: {
    readonly search: string
    readonly searchPlaceholder: string
    readonly allSectors: string
    readonly noResults: string
  }
}) {
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState<string>('all')
  const deferredQuery = useDeferredValue(query)

  const visibleGroups = useMemo(() => {
    const needle = fold(deferredQuery.trim())
    return groups
      .filter((group) => sector === 'all' || group.id === sector)
      .map((group) => {
        if (!needle) return group
        const groupMatches = fold(group.title).includes(needle)
        return {
          ...group,
          companies: groupMatches
            ? group.companies
            : group.companies.filter((c) =>
                fold(`${c.company} ${c.person} ${c.role}`).includes(needle),
              ),
        }
      })
      .filter((group) => group.companies.length > 0)
  }, [groups, sector, deferredQuery])

  const shown = visibleGroups.reduce((n, g) => n + g.companies.length, 0)

  return (
    <>
      <div className="mb-12 flex flex-col gap-4">
        <label className="relative block max-w-xl">
          <span className="sr-only">{labels.search}</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft dark:text-neutral-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="w-full rounded-full border border-line bg-card py-3 pl-11 pr-4 text-sm text-ink placeholder:text-ink-soft focus:border-brand focus:outline-none dark:border-line-dark dark:bg-surface-raised dark:text-surface-text"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label={labels.allSectors}>
          {[{ id: 'all', title: labels.allSectors }, ...groups].map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSector(g.id)}
              aria-pressed={sector === g.id}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                sector === g.id
                  ? 'border-brand bg-brand text-white'
                  : 'border-line text-ink-soft hover:border-ink hover:text-ink dark:border-line-dark dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              {g.title}
            </button>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {shown}
        </p>
      </div>

      {visibleGroups.map((group) => (
        <section key={group.id} className="mb-14 last:mb-0">
          <div className="mb-6 flex items-baseline gap-4">
            <h2 className="font-display text-xl font-bold tracking-tight text-ink dark:text-surface-text md:text-2xl">
              {group.title}
            </h2>
            <span className="tabular font-mono text-xs text-ink-soft dark:text-neutral-500">
              {String(group.companies.length).padStart(2, '0')}
            </span>
            <span className="h-px flex-1 bg-line dark:bg-line-dark" aria-hidden="true" />
          </div>
          <div className="logo-wall grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {group.companies.map((c) => (
              <Link key={c.id} href={c.href} className="logo-cell flex-col gap-3 px-4 py-5">
                <div className="flex h-14 w-full items-center justify-center">
                  {c.logoUrl ? (
                    <CompanyLogo src={c.logoUrl} alt={c.logoAlt} width={120} height={56} />
                  ) : (
                    <span className="text-center text-sm font-semibold text-neutral-900">
                      {c.company}
                    </span>
                  )}
                </div>
                <div className="w-full text-center leading-tight">
                  {/* Without a logo the name is already the tile's centrepiece. */}
                  {c.logoUrl && (
                    <p className="truncate text-xs font-semibold text-neutral-900" title={c.company}>
                      {c.company}
                    </p>
                  )}
                  {c.person && (
                    <p className="mt-1 truncate text-[11px] text-neutral-500" title={c.person}>
                      {c.person}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {shown === 0 && (
        <p className="border-t border-line py-12 text-sm text-ink-soft dark:border-line-dark dark:text-neutral-400">
          {labels.noResults}
        </p>
      )}
    </>
  )
}
