'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { MemberCard } from './MemberCard'
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

  return (
    <>
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
        <input
          type="text"
          placeholder={t('common', 'searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-neutral-300 dark:border-neutral-600 bg-white text-ink dark:bg-surface dark:text-surface-text rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none"
        />
      </div>

      {filteredGroups.length === 0 ? (
        <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
          {t('members', 'noMembers')}
        </p>
      ) : (
        filteredGroups.map((group) => (
          <section key={group.groupId} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-ink dark:text-surface-text">
                {group.title}
              </h2>
              <span className="bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm px-3 py-1 rounded-full">
                {group.rating.toFixed(2)}
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
                />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  )
}
