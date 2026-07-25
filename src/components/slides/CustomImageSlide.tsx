'use client'

interface CustomImageSlideProps {
  readonly imageUrl: string
  readonly displayMode: 'contain' | 'cover'
  readonly backgroundColor: string
  readonly title?: string | null
}

export function CustomImageSlide({
  imageUrl,
  displayMode,
  backgroundColor,
  title,
}: CustomImageSlideProps) {
  return (
    <div
      className="h-full w-full flex items-center justify-center rounded-lg overflow-hidden"
      style={{ backgroundColor }}
    >
      <img
        src={imageUrl}
        alt={title || 'Slide image'}
        className={
          displayMode === 'cover' ? 'w-full h-full object-cover' : 'max-w-full max-h-full object-contain'
        }
        crossOrigin="anonymous"
      />
    </div>
  )
}
