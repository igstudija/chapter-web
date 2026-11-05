import { withPayload } from '@payloadcms/next/withPayload'

/**
 * Hosts allowed to serve images through `next/image`.
 *
 * Derived from SUPABASE_URL so a correctly configured install needs nothing
 * extra. NEXT_PUBLIC_IMAGE_HOSTS (comma-separated hostnames) covers the cases
 * where media also comes from somewhere else — a CDN in front of storage, or
 * images still referenced from a previous host after a migration.
 */
const imageHosts = () => {
  const hosts = new Set()

  if (process.env.SUPABASE_URL) {
    try {
      hosts.add(new URL(process.env.SUPABASE_URL).hostname)
    } catch {
      console.warn('[next.config] SUPABASE_URL is not a valid URL; skipping its image host')
    }
  }

  for (const host of (process.env.NEXT_PUBLIC_IMAGE_HOSTS || '').split(',')) {
    const trimmed = host.trim()
    if (trimmed) hosts.add(trimmed)
  }

  return [...hosts].map((hostname) => ({ protocol: 'https', hostname }))
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output is what the Dockerfile copies out. Vercel builds its own
  // function bundles and ignores it, so it is left off there rather than
  // spending build time producing an artifact nothing reads.
  ...(process.env.VERCEL === '1' ? {} : { output: 'standalone' }),
  typescript: {
    // Ignore TypeScript errors during build (PostgreSQL migration in progress)
    ignoreBuildErrors: true,
  },
  images: {
    // Self-hosted (Docker): served straight from object storage, unoptimized
    // on purpose. The in-process optimizer (sharp) was the main driver of
    // unbounded RSS growth there: every remote image was re-fetched and
    // re-encoded in the app's own memory, which held RSS above the container
    // health-check threshold until it got killed.
    //
    // On Vercel that reason does not exist — optimisation runs in Vercel's
    // image service, not in the app's function — and leaving it off cost the
    // home page its LCP: a 1920 px, 457 KB hero downloaded in full on phones
    // (7.2 s mobile LCP in the 2026-11-04 audit). There it is on, with AVIF/WebP.
    unoptimized: process.env.VERCEL !== '1',
    formats: ['image/avif', 'image/webp'],
    remotePatterns: imageHosts(),
  },
  webpack: (webpackConfig, { isServer }) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
