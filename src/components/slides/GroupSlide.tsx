'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowDown, ArrowUp } from 'lucide-react'

interface Member {
  id: string
  name: string
  surname: string
  company: string
  jobPosition?: string | null
  tyfcbGiven?: number | null
  tyfcbReceived?: number | null
  profileImage?: { url?: string | null } | null
  logo?: { url?: string | null } | null
  powerGroupLead?: boolean | null
}

interface PowerGroup {
  id: string
  title: string
  description?: string | null
}

interface GroupSlideTranslations {
  groupSubtitle: string
  lookingForPartners: string
  businessReceived: string
  businessGiven: string
}

interface GroupSlideProps {
  group: PowerGroup
  members: Member[]
  translations: GroupSlideTranslations
}

const RIGHT_PANEL_WIDTH = 520

export function GroupSlide({ group, members, translations }: GroupSlideProps) {
  const sortedMembers = [...members].sort((a, b) => {
    if (a.powerGroupLead && !b.powerGroupLead) return -1
    if (!a.powerGroupLead && b.powerGroupLead) return 1
    return 0
  })

  const totalGiven = members.reduce((sum, m) => sum + (m.tyfcbGiven ?? 0), 0)
  const totalReceived = members.reduce((sum, m) => sum + (m.tyfcbReceived ?? 0), 0)

  const memberCount = sortedMembers.length
  let gridCols: number
  if (memberCount <= 6) gridCols = memberCount
  else if (memberCount <= 12) gridCols = Math.ceil(memberCount / 2)
  else gridCols = Math.ceil(memberCount / 3)
  gridCols = Math.min(gridCols, 6)

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '0 €'
    return (
      new Intl.NumberFormat('lv-LV', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value) + ' €'
    )
  }

  return (
    <div className="relative flex h-full w-full bg-white rounded-lg overflow-hidden">
      {/* LEFT: title + stats + members */}
      <div className="flex flex-1 flex-col px-12 pt-10 pb-6">
        <div className="flex items-start justify-between gap-10 pl-28">
          <div className="flex max-w-[760px] flex-col">
            <h1 className="text-[4.5rem] font-extrabold leading-[1] tracking-tight text-[#1a2744]">
              {group.title}
            </h1>
            <div className="mt-4 mb-2 h-[3px] w-16 rounded bg-red-600" />
            <p className="text-3xl text-neutral-600">{translations.groupSubtitle}</p>
          </div>

          <div className="mt-3 flex shrink-0 items-start gap-4 pt-2">
            <StatCard
              color="green"
              ArrowIcon={ArrowDown}
              value={formatCurrency(totalReceived)}
              label={translations.businessReceived}
            />
            <StatCard
              color="red"
              ArrowIcon={ArrowUp}
              value={formatCurrency(totalGiven)}
              label={translations.businessGiven}
            />
          </div>
        </div>

        <div className="flex flex-1 items-start pl-28 pt-10">
          <div
            className="grid gap-x-4 gap-y-5"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, minmax(0, 180px))`,
            }}
          >
            {sortedMembers.map((member) => (
              <div
                key={member.id}
                className={`flex w-[180px] flex-col overflow-hidden rounded-xl bg-white shadow-md ${
                  member.powerGroupLead ? 'ring-2 ring-red-600' : 'ring-1 ring-neutral-200'
                }`}
              >
                <div className="relative aspect-square w-full">
                  {member.profileImage?.url ? (
                    <Image
                      src={member.profileImage.url}
                      alt={`${member.name} ${member.surname}`}
                      fill
                      sizes="180px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-200">
                      <span className="text-3xl font-bold text-neutral-400">
                        {member.name.charAt(0)}
                        {member.surname.charAt(0)}
                      </span>
                    </div>
                  )}
                  {member.logo?.url && (
                    <div className="absolute bottom-3 right-3 rounded-md bg-white/95 px-2 py-1 shadow-sm">
                      <Image
                        src={member.logo.url}
                        alt={`${member.company} logo`}
                        width={80}
                        height={32}
                        className="max-h-8 max-w-[80px] object-contain"
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center px-2 pb-3 pt-3 text-center">
                  <p
                    className={`text-lg font-bold leading-tight ${
                      member.powerGroupLead ? 'text-red-600' : 'text-[#1a2744]'
                    }`}
                  >
                    {member.name} {member.surname}
                  </p>
                  <p className="mt-1 text-sm leading-tight text-neutral-500">{member.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: meklejam panel */}
      {group.description && (
        <div
          className="flex flex-col bg-neutral-50 px-8 pt-16 pb-8"
          style={{ width: RIGHT_PANEL_WIDTH }}
        >
          <div className="border-l-4 border-red-600 pl-4">
            <h2 className="text-4xl font-extrabold leading-[1.1] text-red-600">
              {translations.lookingForPartners}
            </h2>
          </div>
          <PartnersList html={group.description} />
        </div>
      )}
    </div>
  )
}

const ITEMS_PER_PAGE = 10
const ROTATION_MS = 5000
const FADE_MS = 500

function PartnersList({ html }: { html: string }) {
  const [pages, setPages] = useState<string[][]>([])
  const [pageIdx, setPageIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [parsed, setParsed] = useState(false)

  useEffect(() => {
    setPageIdx(0)
    setVisible(true)
    if (typeof window === 'undefined') return
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const items = Array.from(doc.querySelectorAll('li')).map((li) => li.innerHTML.trim())
    if (items.length === 0) {
      setPages([])
      setParsed(true)
      return
    }
    const result: string[][] = []
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
      result.push(items.slice(i, i + ITEMS_PER_PAGE))
    }
    setPages(result)
    setParsed(true)
  }, [html])

  useEffect(() => {
    if (pages.length <= 1) return
    const interval = setInterval(() => {
      setVisible(false)
      const swap = setTimeout(() => {
        setPageIdx((i) => (i + 1) % pages.length)
        setVisible(true)
      }, FADE_MS)
      return () => clearTimeout(swap)
    }, ROTATION_MS)
    return () => clearInterval(interval)
  }, [pages.length])

  const listClass =
    'mt-8 text-3xl font-medium leading-snug text-neutral-800 [&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-4 [&_li]:pl-2 [&_li]:marker:text-red-600 [&_p]:m-0'

  if (!parsed || pages.length === 0) {
    return <div className={listClass} dangerouslySetInnerHTML={{ __html: html }} />
  }

  const currentPage = pages[pageIdx] ?? []

  return (
    <div
      className={`${listClass} transition-opacity ease-in-out`}
      style={{ transitionDuration: `${FADE_MS}ms`, opacity: visible ? 1 : 0 }}
    >
      <ul>
        {currentPage.map((itemHtml, i) => (
          <li key={`${pageIdx}-${i}`} dangerouslySetInnerHTML={{ __html: itemHtml }} />
        ))}
      </ul>
    </div>
  )
}

function StatCard({
  color,
  ArrowIcon,
  value,
  label,
}: {
  color: 'green' | 'red'
  ArrowIcon: typeof ArrowUp
  value: string
  label: string
}) {
  const bg =
    color === 'green'
      ? 'bg-gradient-to-br from-green-500 to-green-700'
      : 'bg-gradient-to-br from-red-500 to-red-700'
  const text = color === 'green' ? 'text-green-600' : 'text-red-600'
  return (
    <div className={`flex items-center gap-4 rounded-2xl px-5 py-3 text-white shadow-lg ${bg}`}>
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white">
        <ArrowIcon className={`h-8 w-8 ${text}`} strokeWidth={3.5} />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-4xl font-extrabold tracking-tight">{value}</span>
        <span className="mt-2 text-sm font-semibold uppercase tracking-wider">{label}</span>
      </div>
    </div>
  )
}
