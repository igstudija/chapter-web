import { describe, expect, it } from 'vitest'
import { parseSlideVideo, isSupportedSlideVideoUrl } from '@/lib/slideVideo'
import { isSafariBrowser } from '@/lib/browserDetect'

describe('parseSlideVideo', () => {
  it('accepts every common YouTube link shape', () => {
    const links = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'youtube.com/watch?v=dQw4w9WgXcQ',
    ]

    for (const link of links) {
      const video = parseSlideVideo(link)
      expect(video, link).not.toBeNull()
      expect(video?.provider).toBe('youtube')
      expect(video?.id).toBe('dQw4w9WgXcQ')
    }
  })

  it('builds a muted, looping YouTube embed', () => {
    const embed = parseSlideVideo('https://youtu.be/dQw4w9WgXcQ')?.embedUrl ?? ''
    expect(embed).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(embed).toContain('autoplay=1')
    expect(embed).toContain('mute=1')
    // Looping a single video requires it to name itself as a playlist.
    expect(embed).toContain('playlist=dQw4w9WgXcQ')
  })

  it('accepts Vimeo links, including unlisted hashes', () => {
    expect(parseSlideVideo('https://vimeo.com/76979871')?.id).toBe('76979871')
    expect(parseSlideVideo('https://player.vimeo.com/video/76979871')?.provider).toBe('vimeo')

    const unlistedPath = parseSlideVideo('https://vimeo.com/76979871/abc123def')
    expect(unlistedPath?.hash).toBe('abc123def')
    expect(unlistedPath?.embedUrl).toContain('h=abc123def')

    const unlistedQuery = parseSlideVideo('https://vimeo.com/76979871?h=abc123def')
    expect(unlistedQuery?.hash).toBe('abc123def')
  })

  it('takes the video id, not the collection id, from grouped Vimeo links', () => {
    // Both numbers are valid ids; the first one belongs to the group. Picking
    // it embedded a "video not found" panel that the form accepted happily.
    const grouped = parseSlideVideo('https://vimeo.com/groups/123456/videos/987654321')
    expect(grouped?.id).toBe('987654321')
    expect(grouped?.hash).toBeUndefined()
    expect(grouped?.embedUrl).toContain('/987654321')

    expect(parseSlideVideo('https://vimeo.com/album/123456/video/987654321')?.id).toBe('987654321')
    expect(parseSlideVideo('https://vimeo.com/showcase/123456/video/987654321')?.id).toBe(
      '987654321',
    )
    expect(parseSlideVideo('https://vimeo.com/channels/staffpicks/76979871')?.id).toBe('76979871')

    // A collection page names no video at all — better nothing than a wrong embed.
    expect(parseSlideVideo('https://vimeo.com/groups/123456')).toBeNull()
  })

  it('rejects anything it cannot embed', () => {
    for (const input of [null, undefined, '', '   ', 'not a url', 'https://example.com/video.mp4']) {
      expect(parseSlideVideo(input)).toBeNull()
      expect(isSupportedSlideVideoUrl(input)).toBe(false)
    }
  })
})

describe('isSafariBrowser', () => {
  const SAFARI_MAC =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
  const SAFARI_IOS =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'

  it('flags real Safari on desktop and on iOS', () => {
    expect(isSafariBrowser(SAFARI_MAC)).toBe(true)
    expect(isSafariBrowser(SAFARI_IOS)).toBe(true)
  })

  it('leaves other browsers alone — the gate is on Safari, not on mobile', () => {
    const others = [
      // Chrome / Firefox / Edge on iOS: all carry "Safari" in their UA.
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/124.0 Mobile/15E148 Safari/605.1.15',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/123.0.0.0 Mobile/15E148 Safari/605.1.15',
      // Android Chrome and Samsung Internet.
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
      // Desktop Chrome, Edge, Firefox.
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    ]

    for (const ua of others) {
      expect(isSafariBrowser(ua), ua).toBe(false)
    }
  })
})
