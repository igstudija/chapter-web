# Search, sharing and launch checklist

What to fill in so the site is found, and looks right when someone shares a
link. Do it once at launch and again after changing the domain. Most of it is
in the admin panel under **Settings**.

## In the admin panel

**Settings → Branding → Site Name.** The name goes into every page title, the
`og:site_name` share tag and the Organization record search engines read. Until
it is set they fall back to a placeholder.

**Settings → SEO → Default OG Image.** The picture shown when a link is
shared on Facebook, LinkedIn, WhatsApp or Slack, for every page without one of
its own. Use **1200 × 630 px** — a photo of the group at a meeting works far
better than a logo. Then fill **Default Meta Description**: one or two sentences
saying who you are, where and when you meet.

**Settings → SEO → Google Site Verification** and **Bing Site Verification.** The
codes from each tool's *HTML tag* method, if you verify that way.

**Settings → Social Media.** The full profile URLs. They become the
Organization's `sameAs` links, which is how search engines connect the site
with the profiles — and the footer links to them.

**Settings → Organisation → Language and Timezone.** The language sets
`og:locale`, the guest link (`/viesis` for Latvian, `/guest` otherwise) and the
language Claude is told to write in. The timezone is how meeting times are
shown.

**Homepage → Hero → Meeting note.** One sentence: when, where and how often you
meet. It sits under the main button, so a first-time visitor does not have to
go looking.

**Listing Pages SEO.** Titles, descriptions and share images for `/events`,
`/blog`, `/companies` and the other list pages.

## Outside the site

**Submit the sitemap.** In [Google Search Console](https://search.google.com/search-console)
and [Bing Webmaster Tools](https://www.bing.com/webmasters), add the domain and
submit `https://your-domain.org/sitemap.xml`. Bing can import a verified Search
Console property in one step.

**Point your profiles at the guest link.** In the Instagram, Facebook and
LinkedIn bios, link `https://your-domain.org/viesis` (or `/guest`). It always
lands on the next public meeting's registration form, so the bio never goes
stale. The same link makes a good QR code for printed material.

**Set `SECURITY_CONTACT`** to a `mailto:` or `https:` address so
`/.well-known/security.txt` tells researchers where to report a problem with
your install.

## Check

- Paste a page into the [Facebook sharing debugger](https://developers.facebook.com/tools/debug/)
  or [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/): the
  title, description and image should be yours. Both cache what they saw — use
  their *scrape again* button after changing anything.
- Run an event page through Google's
  [Rich Results Test](https://search.google.com/test/rich-results): it should
  find an Event with a date, location and organizer.
- `https://your-domain.org/llms.txt` gives a plain-text summary of the site for
  AI search tools. It is generated from your content; nothing to maintain.
