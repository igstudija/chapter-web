import { randomBytes } from 'node:crypto'
import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access'
import { decodeConnectionKey } from '../lib/chapterExchange/connectionKey'

/**
 * One link to another chapter.
 *
 * Each record holds both directions of a single relationship: the secret this
 * install minted and handed over, which is how that partner reads us, and the
 * key they handed us, which is how we read them. Neither direction requires the
 * other — a chapter may share without receiving (ADR 0007).
 *
 * Only an admin ever sees this. A connection is a credential and a decision
 * about where members' contact details travel.
 */
export const ChapterConnections: CollectionConfig = {
  slug: 'chapter-connections',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'paused', 'lastReachedAt'],
    group: 'Special request exchange',
    description:
      'Chapters this install exchanges special requests with. Give a partner the key generated here, and paste theirs into the field below.',
  },
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description:
          'What this chapter is called in our list and in the filter. Ours to choose — a partner cannot rename itself here.',
      },
    },
    {
      name: 'ourSecret',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Generated once, when the record is created.',
      },
      hooks: {
        // Minted here rather than in the admin UI so that a connection created
        // by any route — seed script, import, API — still has one.
        beforeValidate: [
          ({ value }) => value || randomBytes(32).toString('base64url'),
        ],
      },
    },
    {
      name: 'theirKey',
      type: 'text',
      label: 'Their connection key',
      admin: {
        description:
          'The key the other chapter generated and sent you. Leave empty to share with them without reading them.',
      },
      validate: (value: string | null | undefined) => {
        if (!value) return true
        return decodeConnectionKey(value)
          ? true
          : 'That is not a connection key. Copy the whole string, including the chx_ prefix.'
      },
    },
    {
      name: 'paused',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Stops serving this partner and stops reading them, without discarding the keys.',
      },
    },
    {
      name: 'lastReachedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description:
          'The last time we read this partner successfully. An unreachable partner is dropped silently from the members list, so this is the only place a failure is visible.',
      },
    },
  ],
  timestamps: true,
}
