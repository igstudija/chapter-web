'use client'

interface Guest {
  name: string
  company?: string | null
  description?: string | null
  attendance?: 'onsite' | 'online'
}

interface GuestDetailSlideProps {
  guest: Guest
  guestNumber: number
  totalGuests: number
  title?: string
}

export function GuestDetailSlide({
  guest,
  guestNumber,
  totalGuests,
  title = 'Viesi',
}: Readonly<GuestDetailSlideProps>) {
  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-br from-gray-50 to-white rounded-lg overflow-hidden">
      {/* Header */}
      <div className="shrink-0 pt-6 pb-2">
        <h1 className="font-bold text-neutral-800 text-center" style={{ fontSize: '56px' }}>
          {title}
          <span className="text-neutral-400 font-normal ml-4" style={{ fontSize: '32px' }}>
            ({guestNumber}/{totalGuests})
          </span>
        </h1>
      </div>

      {/* Guest info - centered, large text */}
      <div className="flex-1 flex items-center justify-center px-16">
        <div className="text-center">
          <div className="font-bold text-neutral-800" style={{ fontSize: '72px', lineHeight: 1.2 }}>
            {guest.name}
          </div>
          {guest.company && (
            <div className="text-neutral-600 mt-4" style={{ fontSize: '56px', lineHeight: 1.2 }}>
              {guest.company}
            </div>
          )}
          {guest.description && (
            <div className="text-neutral-500 italic mt-3" style={{ fontSize: '48px', lineHeight: 1.2 }}>
              {guest.description}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
