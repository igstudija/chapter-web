import { describe, expect, it } from 'vitest'
import { parseSlideVideo, isSupportedSlideVideoUrl } from '@/lib/slideVideo'

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
    for (const input of [
      null,
      undefined,
      '',
      '   ',
      'not a url',
      'https://example.com/video.mp4',
    ]) {
      expect(parseSlideVideo(input)).toBeNull()
      expect(isSupportedSlideVideoUrl(input)).toBe(false)
    }
  })
})
