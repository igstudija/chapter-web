import Link from 'next/link'
import { getSettings } from '@/lib/getSiteSettings'
import Image from 'next/image'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { EventCard, BlogCard, Reveal } from '@/components'
import { ArrowRight } from 'lucide-react'
import type { Media } from '@/payload-types'
import { getTranslations, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import {
  generateMetadata as generateSeoMetadata,
  generateOrganizationSchema,
} from '@/lib/seoHelpers'
import { JsonLd } from '@/components/JsonLd'
import { DEFAULT_ORG_NAME } from '@/lib/branding'

export async function generateMetadata() {
  const headersList = await headers()
  const host = headersList.get('host')


  const currentSite = await getSettings()

  if (!currentSite) {
    return { title: DEFAULT_ORG_NAME }
  }

  const payload = await getPayload({ config })

  const [homepageData, siteSettingsData] = await Promise.all([
    payload.find({
      collection: 'homepage-settings',
      where: {},
      limit: 1,
      depth: 1,
    }),
    payload.find({
      collection: 'settings',
      where: {},
      limit: 1,
      depth: 1,
    }),
  ])

  const homepage = homepageData.docs[0] as any
  const siteSettings = siteSettingsData.docs[0] as any

  const baseUrl = `https://${host}`

  return generateSeoMetadata({
    seo: homepage?.seo,
    contentTitle: homepage?.hero?.title,
    contentDescription: homepage?.hero?.description,
    siteSettings: siteSettings,
    siteBranding: siteSettings?.branding,
    homepageHero: homepage,
    baseUrl,
    pathname: '/',
  })
}

export default async function HomePage() {
  const headersList = await headers()
  const host = headersList.get('host')
  const payload = await getPayload({ config })

  const currentSite = await getSettings()

  const locale = (currentSite?.locale as Locale) || DEFAULT_LOCALE
  const t = getTranslations(locale)

  const { user } = await payload.auth({ headers: headersList })

  // Fetch site-scoped homepage settings and site settings
  const [homepageData, siteSettingsData] = await Promise.all([
    payload.find({
      collection: 'homepage-settings',
      where: {},
      limit: 1,
      depth: 1,
    }),
    payload.find({
      collection: 'settings',
      where: {},
      limit: 1,
      depth: 1,
    }),
  ])

  const homepage = homepageData.docs[0] || null
  const siteSettings = siteSettingsData.docs[0] as any

  // Generate organization schema for structured data
  const baseUrl = `https://${host}`
  const organizationSchema = generateOrganizationSchema({
    siteSettings: siteSettings,
    siteBranding: siteSettings?.branding,
    baseUrl,
  })

  const [eventsData, blogData] = await Promise.all([
    payload.find({
      collection: 'events',
      limit: 3,
      sort: 'date',
      where: {
        _status: { equals: 'published' },
        date: { greater_than: new Date().toISOString() },
        ...(!user ? { isPublic: { equals: true } } : {}),
      },
      depth: 1,
    }),
    payload.find({
      collection: 'blog',
      limit: 3,
      sort: '-publishedAt',
      where: {
        _status: { equals: 'published' },
      },
    }),
  ])

  const hero = homepage?.hero
  const stats = homepage?.stats
  const cta = homepage?.cta
  const backgroundImage =
    hero?.backgroundImage && typeof hero.backgroundImage === 'object'
      ? (hero.backgroundImage as Media)
      : null

  /**
   * The headline highlight used to be split on an empty string when no
   * highlight was configured, which explodes the title into one span per
   * character. Resolve the segments once, up front, and render the plain
   * title when there is nothing to highlight.
   */
  const highlight = hero?.highlightedText?.trim() || ''
  const titleSegments = highlight && hero?.title ? hero.title.split(highlight) : null

  /**
   * The hero deliberately carries no figures.
   *
   * A rail of headline numbers under the headline was the obvious move, and it
   * does not survive contact with the data: `stats.items[].label` is a
   * paragraph of prose, not a caption, so anything short enough to sit under a
   * figure has to be cut out of the middle of a sentence. Truncated Latvian
   * reads as broken copy, and an unlabelled number says nothing. The figures
   * get their room in the band immediately below, which starts within a
   * screen's scroll of the fold.
   */
  const statItems = stats?.items ?? []

  const DEFAULT_STAT_ICONS = [
    'solar:wallet-money-bold-duotone',
    'solar:calendar-bold-duotone',
    'solar:armchair-bold-duotone',
    'solar:users-group-rounded-bold-duotone',
    'solar:hand-money-bold-duotone',
    'mdi:handshake',
  ]
  const statIconUrl = (icon: string | null | undefined, index: number) =>
    `https://api.iconify.design/${icon || DEFAULT_STAT_ICONS[index] || 'mdi:chart-line'}.svg`

  return (
    <>
      {/* Structured Data */}
      <JsonLd data={organizationSchema} />

      {/*
        Hero — a stage, not a banner.

        It fills the viewport, the photograph is pushed back behind a heavy
        scrim and a layer of grain so it reads as the room this happens in
        rather than the subject, and the headline is given the full display
        scale.

        The scrim follows the theme rather than being black in both. A hero
        hard-coded to near-black under a white header and a white stats band
        read as a foreign object dropped into the light theme — the one screen
        on the site that ignored the toggle. Light mode washes the same
        photograph towards paper and sets the type in ink; dark mode is
        unchanged.
      */}
      <section className="grain grain-soft relative isolate flex min-h-[84svh] flex-col overflow-hidden border-b border-line bg-paper text-ink dark:border-line-dark dark:bg-neutral-950 dark:text-white">
        {/* Background Image */}
        {backgroundImage?.url ? (
          <>
            <Image
              src={backgroundImage.url}
              alt={backgroundImage.alt || 'Hero background'}
              fill
              className="scale-105 object-cover"
              sizes="100vw"
              priority
            />
            {/*
              A flat 60% black wash over the whole photo is what made this read
              as a stock-image banner. Two layers do the work now: an even wash
              deep enough to hold display type at any viewport width, and a
              directional gradient on top that keeps the far side of the room
              readable. `enableOverlay` still does its job, layering more of the
              same for images too busy to hold type on their own.

              Both layers are mirrored per theme — paper in light, near-black in
              dark. The light wash is the heavier of the two because ink on a
              thinned photograph needs more separation than white does; the
              gradient still thins out past the measure so the room stays
              visible on the trailing edge.
            */}
            <div className="absolute inset-0 bg-paper/48 dark:bg-neutral-950/56" aria-hidden="true" />
            <div
              className="absolute inset-0 bg-[linear-gradient(94deg,rgba(247,247,245,0.94)0%,rgba(247,247,245,0.74)42%,rgba(247,247,245,0.1)78%,rgba(247,247,245,0.26)100%)] dark:bg-[linear-gradient(94deg,rgba(9,9,11,0.9)0%,rgba(9,9,11,0.64)42%,rgba(9,9,11,0.14)78%,rgba(9,9,11,0.28)100%)]"
              aria-hidden="true"
            />
            {/*
              The directional gradient is measured in percentages of the
              section, so on a phone the headline runs straight through the
              thin end of it. One more even wash below the `md` breakpoint —
              where the copy spans the full width and the photograph has no
              room to be seen anyway — keeps the type off the picture.
            */}
            <div
              className="absolute inset-0 bg-paper/34 dark:bg-neutral-950/25 md:hidden"
              aria-hidden="true"
            />
            {hero?.enableOverlay && (
              <div
                className="absolute inset-0 bg-paper/22 dark:bg-neutral-950/26"
                aria-hidden="true"
              />
            )}
          </>
        ) : (
          /*
            No photograph configured: the brand tint carries the hero on its
            own. It is mixed far weaker in light mode — 32% of a saturated red
            over near-black is a glow, over paper it is a pink wash that ink
            type has to fight.
          */
          <div
            className="absolute inset-0 bg-[radial-gradient(120%_100%_at_12%_0%,color-mix(in_oklab,var(--color-brand)13%,transparent)0%,transparent62%)] dark:bg-[radial-gradient(120%_100%_at_12%_0%,color-mix(in_oklab,var(--color-brand)32%,transparent)0%,transparent60%)]"
            aria-hidden="true"
          />
        )}

        {/* Content */}
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 pb-16 pt-28 sm:px-6 md:pb-24 md:pt-36 lg:px-8">
          <div className="max-w-4xl">
            <p
              className="eyebrow rise-in flex items-center gap-3 dark:text-white/55"
              style={{ animationDelay: '60ms' }}
            >
              <span className="h-px w-8 bg-brand" aria-hidden="true" />
              {currentSite?.siteName || DEFAULT_ORG_NAME}
            </p>
            <h1 className="display-1 rise-in mt-6" style={{ animationDelay: '140ms' }}>
              {titleSegments
                ? titleSegments.map((part, i, arr) => (
                    <span key={`title-part-${i}-${part.substring(0, 10)}`}>
                      {part}
                      {i < arr.length - 1 && (
                        /*
                          The highlighted word gets a slab rather than red
                          letterforms. Brand red on near-black is close to the
                          contrast floor at body size and only just clears it
                          at display size; white on red clears it comfortably,
                          and a solid mark reads louder than coloured text. The
                          `text-white` is not inherited — in light mode the
                          headline is ink, and ink on brand red is the one
                          combination this page must not produce.
                        */
                        <span className="relative inline-block whitespace-nowrap px-[0.12em] text-white">
                          <span
                            className="absolute inset-x-0 bottom-[0.1em] top-[0.06em] -z-10 bg-brand"
                            aria-hidden="true"
                          />
                          {highlight}
                        </span>
                      )}
                    </span>
                  ))
                : hero?.title}
            </h1>
            <p
              className="rise-in mt-8 max-w-xl text-lg leading-relaxed text-ink-soft dark:text-white/70"
              style={{ animationDelay: '220ms' }}
            >
              {hero?.description}
            </p>
            <div
              className="rise-in mt-11 flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: '300ms' }}
            >
              <Link
                href={hero?.primaryButtonLink || '/companies'}
                className="btn btn-primary px-7 py-3.5"
              >
                {hero?.primaryButtonText || t('home', 'viewMembers')}
              </Link>
              <Link
                href={hero?.secondaryButtonLink || '/contacts'}
                className="btn btn-line-invert px-7 py-3.5"
              >
                {hero?.secondaryButtonText || t('contacts', 'title')}
              </Link>
            </div>
          </div>
        </div>

      </section>

      {/*
        Stats Section — the page's signature.

        A business network's claim is that it produces measurable business, so
        the figures are the most characteristic thing this organisation owns.
        They used to sit in a flat brand-red block with 64px cartoon icons,
        which read as decoration, and six identical cells give six figures
        equal weight when they plainly do not have it.

        The first figure — the lifetime total the whole pitch rests on — takes
        a brand-red cell twice the size of the others and the largest type on
        the page after the headline. The rest fill the grid around it. This is
        also the one place the brand colour is allowed to own a whole surface;
        everywhere else it stays ink.
      */}
      <section className="border-b border-line bg-card dark:border-line-dark dark:bg-surface-raised">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <Reveal className="max-w-3xl">
            <p className="eyebrow mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-brand" aria-hidden="true" />
              {currentSite?.siteName || DEFAULT_ORG_NAME}
            </p>
            <h2 className="display-2 text-ink dark:text-surface-text">
              {stats?.title || t('home', 'statsTitle')}
            </h2>
          </Reveal>

          {statItems.length > 0 && (
            /*
              Three columns, with the lead cell two wide and two tall. That is
              not an arbitrary shape: it leaves exactly five slots, which is
              what six stats need. A different number of stats still flows —
              the cells just fill in reading order — so an organisation that
              configures four or eight gets a sensible grid rather than a
              broken one.
            */
            <div className="mt-14 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {statItems.map((stat, index) => {
                const iconUrl = statIconUrl(stat.icon, index)

                if (index === 0) {
                  return (
                    <Reveal
                      key={stat.id}
                      className="grain relative flex min-h-72 flex-col overflow-hidden rounded-2xl bg-brand p-8 text-white sm:col-span-2 lg:row-span-2 md:p-10"
                    >
                      <span
                        aria-hidden="true"
                        className="masked-icon h-9 w-9 shrink-0 text-white/40"
                        style={{ maskImage: `url(${iconUrl})`, WebkitMaskImage: `url(${iconUrl})` }}
                      />
                      <div className="stat-figure-lead mt-auto pt-12">{stat.value}</div>
                      <p className="mt-6 max-w-lg text-sm leading-relaxed text-white/80">
                        {stat.label}
                      </p>
                    </Reveal>
                  )
                }

                return (
                  <Reveal
                    key={stat.id}
                    delay={index * 60}
                    className="panel flex flex-col rounded-2xl p-7"
                  >
                    <span
                      aria-hidden="true"
                      className="masked-icon h-6 w-6 shrink-0 text-brand"
                      style={{ maskImage: `url(${iconUrl})`, WebkitMaskImage: `url(${iconUrl})` }}
                    />
                    <div className="stat-figure mt-auto pt-10 text-ink dark:text-surface-text">
                      {stat.value}
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-ink-soft dark:text-neutral-400">
                      {stat.label}
                    </p>
                  </Reveal>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/*
        Upcoming Events.

        Three equal tiles say all three meetings matter equally. They do not —
        the next one is the one a visitor can actually attend, and it is the
        conversion moment for a network whose pitch is "come to a meeting". It
        takes a large card; the ones behind it become a ruled schedule.
      */}
      <section className="bg-paper py-20 md:py-28 dark:bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-b border-line pb-6 dark:border-line-dark">
            <h2 className="display-2 text-ink dark:text-surface-text">
              {t('home', 'upcomingEvents')}
            </h2>
            <Link
              href="/events"
              className="group flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
            >
              {t('common', 'viewAll')}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
          {eventsData.docs.length > 0 ? (
            <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
              <Reveal>
                <EventCard
                  variant="featured"
                  title={eventsData.docs[0]!.title}
                  date={eventsData.docs[0]!.date}
                  location={eventsData.docs[0]!.location || undefined}
                  slug={String(eventsData.docs[0]!.slug || eventsData.docs[0]!.id)}
                  image={
                    eventsData.docs[0]!.image && typeof eventsData.docs[0]!.image === 'object'
                      ? {
                          url: (eventsData.docs[0]!.image as Media).url || '',
                          alt: (eventsData.docs[0]!.image as Media).alt || undefined,
                        }
                      : undefined
                  }
                />
              </Reveal>
              {eventsData.docs.length > 1 && (
                <Reveal
                  delay={120}
                  className="flex flex-col divide-y divide-line dark:divide-line-dark"
                >
                  {eventsData.docs.slice(1).map((event) => (
                    <EventCard
                      key={event.id}
                      variant="row"
                      title={event.title}
                      date={event.date}
                      location={event.location || undefined}
                      slug={String(event.slug || event.id)}
                      image={
                        event.image && typeof event.image === 'object'
                          ? { url: event.image.url || '', alt: event.image.alt || undefined }
                          : undefined
                      }
                    />
                  ))}
                </Reveal>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-soft dark:text-neutral-400">
              {t('home', 'noUpcomingEvents')}
            </p>
          )}
        </div>
      </section>

      {/* Latest Blog Posts */}
      <section className="border-t border-line bg-card py-20 md:py-28 dark:border-line-dark dark:bg-surface-raised">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-b border-line pb-6 dark:border-line-dark">
            <h2 className="display-2 text-ink dark:text-surface-text">
              {t('home', 'latestNews')}
            </h2>
            <Link
              href="/blog"
              className="group flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
            >
              {t('common', 'viewAll')}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
          {blogData.docs.length > 0 ? (
            /*
              Columns follow the number of posts. A three-column track holding
              one card leaves two thirds of the row empty and reads as a page
              that failed to load rather than a chapter that has published one
              article this month.
            */
            <div
              className={`grid gap-6 ${
                blogData.docs.length === 1
                  ? 'max-w-xl'
                  : blogData.docs.length === 2
                    ? 'sm:grid-cols-2'
                    : 'sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {blogData.docs.map((post, index) => (
                <Reveal key={post.id} delay={index * 90}>
                  <BlogCard
                    title={post.title}
                    excerpt={post.excerpt || undefined}
                    slug={post.slug || String(post.id)}
                    publishedAt={post.publishedAt || undefined}
                    featuredImage={
                      post.featuredImage && typeof post.featuredImage === 'object'
                        ? { url: post.featuredImage.url || '', alt: post.featuredImage.alt || '' }
                        : undefined
                    }
                    variant="homepage"
                  />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-soft dark:text-neutral-400">
              {t('home', 'noBlogPosts')}
            </p>
          )}
        </div>
      </section>

      {/*
        CTA — the closing statement, at the scale of one.

        Both this band and the stats band used to be solid brand red, which is
        why the page read as two red stripes with content wedged between them.
        Red now belongs to the one figure that earns it, to the rule that opens
        this band and to its button; the band itself is the theme's own paper,
        set at display size so the last thing on the page is as loud as the
        first.

        Like the hero, it follows the theme rather than staying near-black in
        both — the two of them were the only surfaces on the page that ignored
        the toggle, which is exactly why they read as foreign.
      */}
      <section className="grain grain-soft relative isolate overflow-hidden bg-paper text-ink dark:bg-neutral-950 dark:text-white">
        <div className="absolute inset-x-0 top-0 h-px bg-brand" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-[radial-gradient(80%_130%_at_50%_0%,color-mix(in_oklab,var(--color-brand)11%,transparent)0%,transparent64%)] dark:bg-[radial-gradient(80%_130%_at_50%_0%,color-mix(in_oklab,var(--color-brand)26%,transparent)0%,transparent62%)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-4xl px-4 py-28 text-center sm:px-6 md:py-36 lg:px-8">
          <Reveal>
            <h2 className="display-page">{cta?.title || t('home', 'ctaTitle')}</h2>
            <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-ink-soft dark:text-white/65">
              {cta?.description || t('home', 'ctaDescription')}
            </p>
            <Link
              href={cta?.buttonLink || '/contacts'}
              className="btn btn-primary mt-11 px-9 py-4 text-base"
            >
              {cta?.buttonText || t('home', 'getInTouch')}
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  )
}
