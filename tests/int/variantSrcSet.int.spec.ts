import { describe, expect, it } from 'vitest'
import { getVariantSrcSet } from '@/lib/getThumbnailUrl'

const BASE = 'https://example.supabase.co/storage/v1/object/public/media/media'

describe('getVariantSrcSet', () => {
  it('offers the medium copy at its real width next to the original', () => {
    const srcSet = getVariantSrcSet(
      { url: `${BASE}/hero.webp`, width: 1792, height: 1024, mimeType: 'image/webp' },
      ['medium'],
    )

    expect(srcSet).toBe(`${BASE}/hero-medium.webp 800w, ${BASE}/hero.webp 1792w`)
  })

  it('scales a portrait by its height, as the thumbnail generator does', () => {
    const srcSet = getVariantSrcSet(
      { url: `${BASE}/portrait.jpg`, width: 1000, height: 2000, mimeType: 'image/jpeg' },
      ['card', 'medium'],
    )

    expect(srcSet).toBe(
      `${BASE}/portrait-card.jpg 200w, ${BASE}/portrait-medium.jpg 400w, ${BASE}/portrait.jpg 1000w`,
    )
  })

  it('leaves out a size that would be no smaller than the original', () => {
    const srcSet = getVariantSrcSet(
      { url: `${BASE}/small.png`, width: 600, height: 400, mimeType: 'image/png' },
      ['card', 'medium'],
    )

    expect(srcSet).toBe(`${BASE}/small-card.png 400w, ${BASE}/small.png 600w`)
  })

  it('gives nothing when no copy is smaller, so the plain src is used', () => {
    expect(
      getVariantSrcSet(
        { url: `${BASE}/tiny.png`, width: 300, height: 300, mimeType: 'image/png' },
        ['medium'],
      ),
    ).toBeUndefined()
  })

  it('gives nothing without dimensions, since a width descriptor would be a guess', () => {
    expect(getVariantSrcSet({ url: `${BASE}/hero.webp` }, ['medium'])).toBeUndefined()
  })

  it('gives nothing for SVG, which has no sized copies', () => {
    expect(
      getVariantSrcSet(
        { url: `${BASE}/logo.svg`, width: 1200, height: 400, mimeType: 'image/svg+xml' },
        ['medium'],
      ),
    ).toBeUndefined()
  })

  it('escapes spaces and commas, which would otherwise split a srcset candidate', () => {
    const srcSet = getVariantSrcSet(
      { url: `${BASE}/Arthur Geisari, 2026.jpg`, width: 1600, height: 1600, mimeType: 'image/jpeg' },
      ['medium'],
    )

    expect(srcSet).toBe(
      `${BASE}/Arthur%20Geisari%2C%202026-medium.jpg 800w, ${BASE}/Arthur%20Geisari%2C%202026.jpg 1600w`,
    )
  })
})
