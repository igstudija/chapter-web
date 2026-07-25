'use client'

import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'

interface MemberData {
  id: string
  name: string
  surname: string
  email: string
  phone: string
  company: string
  jobPosition: string
  website: string
  profileImageUrl: string | null
  powerGroupTitle: string
}

interface VCardsPageClientProps {
  members: MemberData[]
}

function generateVCard(member: MemberData): string {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${member.name} ${member.surname}`,
    `N:${member.surname};${member.name};;;`,
    member.company ? `ORG:${member.company}` : '',
    member.jobPosition ? `TITLE:${member.jobPosition}` : '',
    member.email ? `EMAIL:${member.email}` : '',
    member.phone ? `TEL:${member.phone}` : '',
    member.website
      ? `URL:${member.website.startsWith('http') ? member.website : `https://${member.website}`}`
      : '',
    'END:VCARD',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

const GROUP_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-cyan-500',
]

function getGroupBadgeColor(groupTitle?: string): string {
  if (!groupTitle) return 'bg-gray-500'
  let hash = 0
  for (let i = 0; i < groupTitle.length; i++) {
    hash = ((hash << 5) - hash + groupTitle.charCodeAt(i)) & 0xffffffff
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length] || 'bg-gray-500'
}

/**
 * Optimal grid for 16:9 TV. Minimizes waste, then picks best cell aspect ratio.
 */
function calcGrid(count: number): { cols: number; rows: number } {
  if (count <= 0) return { cols: 1, rows: 1 }

  const screenRatio = 16 / 9
  const idealCellRatio = 1.8
  let best = { cols: 10, rows: 10, waste: 100, score: Infinity }

  for (let cols = 3; cols <= 11; cols++) {
    for (let rows = 2; rows <= 11; rows++) {
      const capacity = cols * rows
      if (capacity < count) continue
      const waste = capacity - count
      const cellRatio = (screenRatio * rows) / cols
      const ratioScore = Math.abs(cellRatio - idealCellRatio)
      if (waste < best.waste || (waste === best.waste && ratioScore < best.score)) {
        best = { cols, rows, waste, score: ratioScore }
      }
    }
  }

  return { cols: best.cols, rows: best.rows }
}

export default function VCardsPageClient({ members }: VCardsPageClientProps) {
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const { cols, rows } = useMemo(() => calcGrid(members.length), [members.length])
  // Base units: cell height in vh, cell width in vw
  const cellH = useMemo(() => (100 - 1) / rows, [rows])
  const cellW = useMemo(() => (100 - 1) / cols, [cols])
  // Text is width-constrained: convert cellW(vw) to vh equivalent on 16:9 = vw * 9/16
  // Use the smaller of height-based and width-based sizing
  const unit = useMemo(() => Math.min(cellH, cellW * (9 / 16)), [cellH, cellW])

  useEffect(() => {
    async function generateQRCodes() {
      const codes: Record<string, string> = {}
      await Promise.all(
        members.map(async (member) => {
          try {
            codes[member.id] = await QRCode.toDataURL(generateVCard(member), {
              width: 120,
              margin: 1,
              errorCorrectionLevel: 'M',
              color: { dark: '#000000', light: '#FFFFFF' },
            })
          } catch {
            // skip
          }
        }),
      )
      setQrCodes(codes)
      setLoading(false)
    }
    generateQRCodes()
  }, [members])

  // All sizes derived from unit (min of cellH, cellW adjusted for aspect ratio)
  const photoSize = `${cellH * 0.45}vh`
  const nameSize = `${unit * 0.12}vh`
  const companySize = `${unit * 0.09}vh`
  const badgeSize = `${unit * 0.09}vh`
  const badgePad = `${unit * 0.03}vh`

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex h-screen w-screen items-center justify-center overflow-hidden bg-slate-900">
        <div className="py-12 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-400 border-t-transparent" />
          <h3 className="mt-2 text-sm font-medium text-gray-400">Ielādē...</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] h-screen w-screen overflow-hidden bg-slate-900 p-1">
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          gap: '3px',
        }}
      >
        {members.slice(0, cols * rows).map((member) => (
          <div key={member.id} className="rounded bg-white overflow-hidden">
            <div className="grid h-full w-full grid-cols-2">
              {/* Left: image + name + company */}
              <div className="relative flex flex-col items-center justify-center overflow-hidden px-[2px]">
                {/* Group Badge */}
                {member.powerGroupTitle && (
                  <div
                    className={`absolute left-0 top-0 rounded-br font-bold text-white ${getGroupBadgeColor(member.powerGroupTitle)}`}
                    style={{ fontSize: badgeSize, padding: `${badgePad} ${badgePad}`, lineHeight: 1 }}
                  >
                    {member.powerGroupTitle.substring(0, 3).toUpperCase()}
                  </div>
                )}

                {/* Photo */}
                {member.profileImageUrl ? (
                  <img
                    src={member.profileImageUrl}
                    alt={`${member.name} ${member.surname}`}
                    className="rounded-full object-cover"
                    style={{ width: photoSize, height: photoSize }}
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="flex items-center justify-center rounded-full bg-slate-100"
                    style={{ width: photoSize, height: photoSize }}
                  >
                    <svg
                      className="text-slate-400"
                      style={{ width: '40%', height: '40%' }}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                      />
                    </svg>
                  </div>
                )}

                {/* Name */}
                <div
                  className="w-full text-center font-bold leading-tight text-gray-900"
                  style={{ fontSize: nameSize, marginTop: `${cellH * 0.02}vh` }}
                >
                  {member.name} {member.surname}
                </div>

                {/* Company */}
                <div
                  className="w-full text-center leading-tight text-gray-500 line-clamp-2"
                  style={{ fontSize: companySize }}
                >
                  {member.company}
                </div>
              </div>

              {/* Right: QR Code */}
              <div className="flex items-center justify-center p-[2px]">
                {qrCodes[member.id] && (
                  <img
                    src={qrCodes[member.id]}
                    alt="QR"
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
