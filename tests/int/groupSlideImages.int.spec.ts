import { describe, expect, it } from 'vitest'
import { groupSlideLogoUrl, groupSlidePhotoUrl } from '@/components/slides/GroupSlide'

const STORAGE = 'https://example.supabase.co/storage/v1/object/public/media/media'

describe('group slide image URLs', () => {
  it('draws member photos from the 400 px -card copy written at upload', () => {
    expect(groupSlidePhotoUrl(`${STORAGE}/V8A3261-Edit.jpg`)).toBe(
      `${STORAGE}/V8A3261-Edit-card.jpg`,
    )
  })

  it('draws logos from the 200 px -thumbnail copy', () => {
    expect(groupSlideLogoUrl(`${STORAGE}/Ekspress.png`)).toBe(`${STORAGE}/Ekspress-thumbnail.png`)
  })

  it('keeps an SVG logo as it is, since upload writes no sized copies for it', () => {
    expect(groupSlideLogoUrl(`${STORAGE}/logo.svg`)).toBe(`${STORAGE}/logo.svg`)
  })
})
