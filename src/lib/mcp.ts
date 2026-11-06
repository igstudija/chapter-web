import { mcpPlugin, type MCPPluginConfig } from '@payloadcms/plugin-mcp'
import { UnauthorizedError, type CollectionConfig, type CollectionSlug } from 'payload'
import { adminOnly, isAdmin } from '../access'
import { PRODUCT_NAME } from './branding'

/**
 * The MCP server at `/api/mcp` — lets an assistant such as Claude read and edit
 * this install's content on an administrator's behalf.
 *
 * Three gates, each closed by default:
 *
 * 1. **What can be offered at all** is the list below. It never includes
 *    `users` (passwords, login tokens), `audit-logs`, `chapter-connections`
 *    (another chapter's shared secret) or any delete. Removing a member or an
 *    event stays a click in the admin panel, where it asks first.
 * 2. **What a key may use** is ticked per key in the admin panel
 *    (MCP → API Keys). Every box starts unticked.
 * 3. **What the key's owner may do** — every call runs as that user with
 *    ordinary access control (`overrideAccess: false`), and the key only
 *    works while its owner is an administrator in good standing. Demote or
 *    block someone and their keys stop answering at once.
 *
 * `MCP_DISABLED=1` takes the endpoint away without touching the schema, so the
 * keys table and its migration stay put.
 *
 * Setup for administrators: docs/howto/connect-claude-with-mcp.md.
 */

const READ = { find: true }
const EDIT = { find: true, update: true }
const WRITE = { find: true, create: true, update: true }

type Exposed = NonNullable<MCPPluginConfig['collections']>

export const MCP_COLLECTIONS: Exposed = {
  events: {
    enabled: WRITE,
    description:
      'Meetings and events: title, date, location, description, registration. Drafts are supported; publish by setting _status to "published".',
  },
  'event-submissions': {
    enabled: READ,
    description: 'Guest registrations for events — who signed up for which event, with contact details.',
  },
  blog: {
    enabled: WRITE,
    description: 'Blog posts shown on /blog. Drafts are supported.',
  },
  'success-stories': {
    enabled: WRITE,
    description: 'Success stories: business members did with each other, shown on /success-stories.',
  },
  wiki: {
    enabled: WRITE,
    description: 'Members-only knowledge pages (/wiki). Drafts are supported.',
  },
  'special-requests': {
    enabled: WRITE,
    description: 'Short-lived "I am looking for…" requests posted by members.',
  },
  members: {
    enabled: EDIT,
    description:
      'Member profiles: name, company, position, contact details, power group, slide settings. displayName is computed — do not set it.',
  },
  'power-groups': {
    enabled: READ,
    description: 'Power groups: members grouped by related industries.',
  },
  top40: {
    enabled: READ,
    description: 'Each member’s Top 40 list: companies and contacts they want to be introduced to.',
  },
  top20: {
    enabled: READ,
    description: 'Each member’s Top 20 list: the companies and contacts they are looking for.',
  },
  'contact-submissions': {
    enabled: READ,
    description: 'Messages sent through the public contact form.',
  },
  media: {
    enabled: READ,
    description: 'Uploaded images and files. Read-only here; upload through the admin panel.',
  },
  settings: {
    enabled: READ,
    description: 'Site-wide settings: name, language, timezone, social links, analytics IDs.',
  },
  'homepage-settings': {
    enabled: EDIT,
    description: 'Home page content: hero text, the next-meeting note, statistics, calls to action.',
  },
  'about-us-settings': { enabled: EDIT, description: 'The About page content.' },
  'faq-settings': { enabled: EDIT, description: 'Frequently asked questions shown on /faq.' },
  'contacts-page-settings': {
    enabled: EDIT,
    description: 'The Contacts page: contact persons and contact form settings.',
  },
  'companies-page-settings': { enabled: EDIT, description: 'The Companies directory page text.' },
  'listing-pages-seo': {
    enabled: EDIT,
    description: 'Titles, descriptions and share images for the listing pages (blog, events, companies…).',
  },
  'slideshow-settings-collection': {
    enabled: EDIT,
    description:
      'Meeting slideshow settings: slide order and timing, and skipMembers — the members left out of this week’s slides (e.g. absent). skipMembers holds member IDs; find them in members by displayName.',
  },
}

const INSTRUCTIONS = `This server is the content and membership database of a professional networking chapter, run on ${PRODUCT_NAME} (Payload CMS).
Members meet weekly, present their businesses on slides and pass each other referrals.
Content is usually in the site's configured language (see settings.locale) — write in that language unless asked otherwise.
Dates are stored in UTC; the chapter's timezone is settings.timezone.
Prefer find before update, change only the fields you were asked to, and say what you changed.`

/** The key works only while its owner is an administrator who is not blocked. */
export const requireActiveAdmin: NonNullable<MCPPluginConfig['overrideAuth']> = async (
  _req,
  getDefaultMcpAccessSettings,
) => {
  const settings = await getDefaultMcpAccessSettings()
  const owner = settings.user as { role?: string; status?: string } | undefined
  if (!isAdmin(owner) || owner?.status === 'blocked') throw new UnauthorizedError()
  return settings
}

/** Keys are an administrator's business, including revoking a colleague's. */
const adminManagedKeys = (collection: CollectionConfig): CollectionConfig => ({
  ...collection,
  access: {
    ...collection.access,
    create: adminOnly,
    read: adminOnly,
    update: adminOnly,
    delete: adminOnly,
    unlock: adminOnly,
  },
})

export const mcp = mcpPlugin({
  disabled: process.env.MCP_DISABLED === '1',
  userCollection: 'users' as CollectionSlug,
  collections: MCP_COLLECTIONS,
  overrideAuth: requireActiveAdmin,
  overrideApiKeyCollection: adminManagedKeys,
  mcp: {
    serverOptions: {
      serverInfo: { name: PRODUCT_NAME, version: '1.0.0' },
      instructions: INSTRUCTIONS,
    },
  },
})
