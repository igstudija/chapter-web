'use client'

import { useState, useMemo } from 'react'
import { Users } from 'lucide-react'
import { MemberCard } from './MemberCard'
import { ListSearch } from './ListSearch'
import { useTranslations } from './TranslationsProvider'
import slugify from 'slugify'

interface Member {
  id: string
  name: string
  surname: string
  company: string
  jobPosition?: string | null
  orgRole?: string | null
  phone?: string | null
  email?: string | null
  profileImage?:
    | {
        url?: string | null
        alt?: string | null
      }
    | string
    | null
  logo?:
    | {
        url?: string | null
        alt?: string | null
      }
    | string
    | null
  top40Count: number
  top20Count: number
  specialRequestsCount: number
}

interface PowerGroup {
  groupId: string
  title: string
  members: Member[]
  rating: number
}

interface MembersSearchProps {
  groups: PowerGroup[]
}

function generateSlug(name: string, surname: string): string {
  return slugify(`${name}-${surname}`, { lower: true, strict: true })
}

export function MembersSearch({ groups }: MembersSearchProps) {
  const { t } = useTranslations()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groups
    }

    const query = searchQuery.toLowerCase().trim()

    return groups
      .map((group) => ({
        ...group,
        members: group.members.filter(
          (member) =>
            member.name.toLowerCase().includes(query) ||
            member.surname.toLowerCase().includes(query) ||
            member.company.toLowerCase().includes(query) ||
            `${member.name} ${member.surname}`.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.members.length > 0)
  }, [groups, searchQuery])

  const visibleMemberCount = filteredGroups.reduce((sum, g) => sum + g.members.length, 0)
  const totalMemberCount = groups.reduce((sum, g) => sum + g.members.length, 0)

  return (
    <>
      <ListSearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={t('common', 'searchPlaceholder')}
        resultCount={visibleMemberCount}
        totalCount={totalMemberCount}
        sticky
        className="mb-8"
      />

      {filteredGroups.length === 0 ? (
        <div className="panel empty-state">
          <Users className="h-7 w-7 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
          <p className="text-sm">{t('members', 'noMembers')}</p>
        </div>
      ) : (
        filteredGroups.map((group) => (
          <section key={group.groupId} className="mb-12">
            {/* The group's rating is a number to compare across groups, so it is
                set in tabular figures beside the name rather than dropped into a
                grey lozenge that reads like a tag. */}
            <div className="mb-6 flex items-baseline gap-3">
              <h2 className="font-display text-xl font-bold tracking-tight text-ink dark:text-surface-text">
                {group.title}
              </h2>
              <span className="tabular font-mono text-sm text-brand">
                {Math.round(group.rating)}%
              </span>
              <span className="tabular ml-auto font-mono text-xs text-neutral-400 dark:text-neutral-500">
                {group.members.length}
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {group.members.map((member) => (
                <MemberCard
                  key={member.id}
                  id={generateSlug(member.name, member.surname)}
                  name={member.name}
                  surname={member.surname}
                  company={member.company}
                  jobPosition={member.jobPosition || undefined}
                  orgRole={member.orgRole || undefined}
                  phone={member.phone || undefined}
                  email={member.email || undefined}
                  profileImage={
                    member.profileImage && typeof member.profileImage === 'object'
                      ? {
                          url: member.profileImage.url || '',
                          alt: member.profileImage.alt || undefined,
                        }
                      : undefined
                  }
                  logo={
                    member.logo && typeof member.logo === 'object'
                      ? { url: member.logo.url || '', alt: member.logo.alt || '' }
                      : undefined
                  }
                  specialRequestsCount={member.specialRequestsCount}
                  top40Count={member.top40Count}
                  top20Count={member.top20Count}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  )
}
