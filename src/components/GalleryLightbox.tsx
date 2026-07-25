'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface GalleryItem {
  id?: string | number | null
  image: string | number | { id: string | number; url?: string | null }
  caption?: string | null
}

interface GalleryLightboxProps {
  gallery: GalleryItem[]
}

export function GalleryLightbox({ gallery }: Readonly<GalleryLightboxProps>) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const images = gallery
    .map((item) => ({
      url: typeof item.image === 'object' ? item.image.url : '',
      caption: item.caption,
      id: item.id,
    }))
    .filter((img) => img.url)

  const openLightbox = (index: number) => {
    setCurrentIndex(index)
    setIsOpen(true)
  }

  const closeLightbox = () => {
    setIsOpen(false)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') goToPrevious()
      if (e.key === 'ArrowRight') goToNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex])

  if (images.length === 0) return null

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((item, index) => (
          <button
            key={item.id || `gallery-${index}`}
            type="button"
            onClick={() => openLightbox(index)}
            className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand rounded-lg overflow-hidden"
          >
            <Image
              src={item.url!}
              alt={item.caption || 'Gallery image'}
              width={300}
              height={200}
              className="w-full h-40 object-cover rounded-lg transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg" />
            {item.caption && (
              <p className="mt-1 text-xs text-neutral-500 truncate text-left">{item.caption}</p>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Image lightbox"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 w-full h-full p-0"
        >
          {/* Backdrop click handler */}
          <div className="absolute inset-0 -z-10" onClick={closeLightbox} aria-hidden="true" />
          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white hover:text-neutral-300 transition-colors z-10"
            aria-label="Close lightbox"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Previous button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goToPrevious()
              }}
              className="absolute left-4 p-2 text-white hover:text-neutral-300 transition-colors z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-10 w-10" />
            </button>
          )}

          {/* Image container */}
          <div className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center">
            <Image
              src={images[currentIndex].url!}
              alt={images[currentIndex].caption || 'Gallery image'}
              width={1200}
              height={800}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {images[currentIndex].caption && (
              <p className="mt-4 text-white text-center text-lg">{images[currentIndex].caption}</p>
            )}
            {/* Image counter */}
            <p className="mt-2 text-neutral-400 text-sm">
              {currentIndex + 1} / {images.length}
            </p>
          </div>

          {/* Next button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goToNext()
              }}
              className="absolute right-4 p-2 text-white hover:text-neutral-300 transition-colors z-10"
              aria-label="Next image"
            >
              <ChevronRight className="h-10 w-10" />
            </button>
          )}
        </div>
      )}
    </>
  )
}
