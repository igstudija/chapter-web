// @vitest-environment jsdom
import React from 'react'
import { render, screen, act, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SlideMedia, SLIDE_IMAGE_CYCLE_MS, memberSlideImages } from '@/components/slides/SlideMedia'

afterEach(cleanup)

const IMAGES = ['/a.jpg', '/b.jpg', '/c.jpg']

/** Which stacked layer is currently faded in (opacity 1). */
function layers(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-slide-layer]'))
}

function visibleIndex(container: HTMLElement): number {
  return layers(container).findIndex((layer) => layer.style.opacity === '1')
}

describe('SlideMedia image sequence', () => {
  it('cross-fades through every image and loops within the cycle', () => {
    vi.useFakeTimers()
    try {
      const { container } = render(React.createElement(SlideMedia, { images: IMAGES, alt: 'slide' }))

      // Each image gets an equal share of the 30s cycle.
      const step = SLIDE_IMAGE_CYCLE_MS / IMAGES.length
      expect(visibleIndex(container)).toBe(0)

      act(() => void vi.advanceTimersByTime(step))
      expect(visibleIndex(container)).toBe(1)

      act(() => void vi.advanceTimersByTime(step))
      expect(visibleIndex(container)).toBe(2)

      // Wraps around rather than stopping on the last image.
      act(() => void vi.advanceTimersByTime(step))
      expect(visibleIndex(container)).toBe(0)

      // Every image is mounted the whole time; only opacity changes, so the
      // transition is a cross-fade rather than a swap.
      expect(container.querySelectorAll('img')).toHaveLength(3)
      for (const layer of layers(container)) {
        expect(layer.style.transition).toContain('opacity')
      }
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps advancing when the parent re-renders with a fresh array', () => {
    // The viewer re-renders once a second while its countdown ticks, handing
    // SlideMedia a newly built array each time. That must not restart the cycle.
    vi.useFakeTimers()
    try {
      const { container, rerender } = render(
        React.createElement(SlideMedia, { images: [...IMAGES], alt: 'slide' }),
      )
      const step = SLIDE_IMAGE_CYCLE_MS / IMAGES.length

      act(() => void vi.advanceTimersByTime(step))
      expect(visibleIndex(container)).toBe(1)

      // Same URLs, brand-new array — exactly what memberSlideImages() produces.
      rerender(React.createElement(SlideMedia, { images: [...IMAGES], alt: 'slide' }))
      expect(visibleIndex(container)).toBe(1)

      act(() => void vi.advanceTimersByTime(step))
      expect(visibleIndex(container)).toBe(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('restarts from the first image when the images actually change', () => {
    vi.useFakeTimers()
    try {
      const { container, rerender } = render(
        React.createElement(SlideMedia, { images: IMAGES, alt: 'slide' }),
      )
      act(() => void vi.advanceTimersByTime(SLIDE_IMAGE_CYCLE_MS / IMAGES.length))
      expect(visibleIndex(container)).toBe(1)

      rerender(React.createElement(SlideMedia, { images: ['/x.jpg', '/y.jpg'], alt: 'slide' }))
      expect(visibleIndex(container)).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders a single image without any timer', () => {
    render(React.createElement(SlideMedia, { images: ['/only.jpg'], alt: 'slide' }))
    const img = screen.getByRole('img') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/only.jpg')
    expect(img.style.opacity).toBe('')
  })

  it('shows the fallback when there is no media', () => {
    render(
      React.createElement(SlideMedia, {
        images: [],
        fallback: React.createElement('span', null, 'ACME Ltd'),
      }),
    )
    expect(screen.getByText('ACME Ltd')).toBeTruthy()
  })

  it('embeds the video and ignores images when the member picked video', () => {
    const { container } = render(
      React.createElement(SlideMedia, {
        images: IMAGES,
        mediaType: 'video',
        videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      }),
    )
    const iframe = container.querySelector('iframe')
    expect(iframe?.getAttribute('src')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  it('falls back when video mode has no usable link', () => {
    const { container } = render(
      React.createElement(SlideMedia, {
        images: IMAGES,
        mediaType: 'video',
        videoUrl: 'https://example.com/not-a-video',
        fallback: React.createElement('span', null, 'ACME Ltd'),
      }),
    )
    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.getByText('ACME Ltd')).toBeTruthy()
  })
})

describe('memberSlideImages', () => {
  it('prefers the multi-image list', () => {
    expect(
      memberSlideImages({
        slideImages: [{ url: '/one.jpg' }, { url: '/two.jpg' }],
        slideImage: { url: '/legacy.jpg' },
      }),
    ).toEqual(['/one.jpg', '/two.jpg'])
  })

  it('falls back to the legacy single image', () => {
    expect(memberSlideImages({ slideImages: [], slideImage: { url: '/legacy.jpg' } })).toEqual([
      '/legacy.jpg',
    ])
    expect(memberSlideImages({ slideImages: null, slideImage: null })).toEqual([])
  })
})
