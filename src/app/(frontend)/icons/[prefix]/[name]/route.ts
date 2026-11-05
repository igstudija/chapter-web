import { parseIconName } from '@/lib/iconPath'

/**
 * /icons/<prefix>/<name>.svg — an Iconify icon, fetched once from Iconify and
 * then served from this origin with a year-long cache. See src/lib/iconPath.ts.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ prefix: string; name: string }> },
) {
  const { prefix, name } = await params
  const icon = parseIconName(`${prefix}/${name}`)
  if (!icon) return new Response('Not found', { status: 404 })

  const upstream = await fetch(`https://api.iconify.design/${icon.prefix}/${icon.name}.svg`, {
    // Icons do not change; let the data cache keep them across requests too.
    next: { revalidate: 60 * 60 * 24 * 30 },
  }).catch(() => null)

  if (!upstream || !upstream.ok) {
    return new Response('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'public, max-age=300' },
    })
  }

  const svg = await upstream.text()
  if (!svg.trimStart().startsWith('<svg')) return new Response('Not found', { status: 404 })

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      // Served from our origin, an SVG opened directly is a document that could
      // run script. These icons are used only as CSS masks; forbid the rest.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
