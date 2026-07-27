/**
 * YouTube / Vimeo links pasted by members are turned into embed URLs here.
 *
 * Slides play video as ambience: autoplaying, muted and looping, with chrome
 * hidden. Muted is not a preference — browsers refuse to autoplay a video with
 * sound, and a slideshow nobody can click is exactly the case where that
 * refusal leaves a black rectangle on the projector.
 */

export type SlideVideoProvider = 'youtube' | 'vimeo'

export interface SlideVideo {
  provider: SlideVideoProvider
  /** Provider-side video id, e.g. `dQw4w9WgXcQ` or `76979871`. */
  id: string
  /** Unlisted-Vimeo privacy hash, when the link carried one. */
  hash?: string
  /** Ready-to-use `<iframe src>`: autoplay, muted, looping, no controls. */
  embedUrl: string
}

const YOUTUBE_ID = /^[\w-]{11}$/
const VIMEO_ID = /^\d+$/

function youtubeEmbedUrl(id: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    // Looping a single video requires naming it as its own one-item playlist.
    playlist: id,
    controls: '0',
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
    iv_load_policy: '3',
    disablekb: '1',
  })
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`
}

function vimeoEmbedUrl(id: string, hash?: string): string {
  const params = new URLSearchParams({
    // `background=1` is Vimeo's shorthand for muted autoplay, looping and no UI.
    background: '1',
    autoplay: '1',
    muted: '1',
    loop: '1',
    autopause: '0',
    dnt: '1',
  })
  if (hash) params.set('h', hash)
  return `https://player.vimeo.com/video/${id}?${params.toString()}`
}

function parseYoutube(url: URL): SlideVideo | null {
  const host = url.hostname.replace(/^www\./, '')
  const segments = url.pathname.split('/').filter(Boolean)

  let id: string | null = null

  if (host === 'youtu.be') {
    id = segments[0] || null
  } else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    if (segments[0] === 'watch') {
      id = url.searchParams.get('v')
    } else if (['embed', 'shorts', 'live', 'v'].includes(segments[0])) {
      id = segments[1] || null
    }
  }

  if (!id || !YOUTUBE_ID.test(id)) return null
  return { provider: 'youtube', id, embedUrl: youtubeEmbedUrl(id) }
}

function parseVimeo(url: URL): SlideVideo | null {
  const host = url.hostname.replace(/^www\./, '')
  if (!host.endsWith('vimeo.com')) return null

  const segments = url.pathname.split('/').filter(Boolean)
  // player.vimeo.com/video/123, vimeo.com/123, vimeo.com/channels/staffpicks/123
  const idIndex = segments.findIndex((segment) => VIMEO_ID.test(segment))
  if (idIndex === -1) return null

  const id = segments[idIndex]
  // Unlisted videos carry their hash either as the next path segment or as `?h=`.
  const next = segments[idIndex + 1]
  const hash = url.searchParams.get('h') || (next && !VIMEO_ID.test(next) ? next : undefined)

  return { provider: 'vimeo', id, hash: hash || undefined, embedUrl: vimeoEmbedUrl(id, hash || undefined) }
}

/**
 * Parse a YouTube or Vimeo link into an embeddable slide video.
 * Returns `null` for anything we can't confidently embed — callers treat that
 * as "no video", never as an error worth breaking the slideshow over.
 */
export function parseSlideVideo(input: string | null | undefined): SlideVideo | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  return parseYoutube(url) || parseVimeo(url)
}

export function isSupportedSlideVideoUrl(input: string | null | undefined): boolean {
  return parseSlideVideo(input) !== null
}
