import { randomBytes } from 'node:crypto'
import type { CollectionConfig, Payload } from 'payload'
import { adminOnly } from '../access'
import { decodeConnectionKey, encodeConnectionKey } from '../lib/chapterExchange/connectionKey'

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

const newSecret = () => randomBytes(32).toString('base64url')

/** What this chapter calls itself, for the key we hand out. */
const chapterName = async (payload: Payload): Promise<string> => {
  try {
    const settings = await payload.find({ collection: 'settings', limit: 1, depth: 0 })
    return settings.docs[0]?.siteName || 'Unnamed chapter'
  } catch {
    return 'Unnamed chapter'
  }
}

export const ChapterConnections: CollectionConfig = {
  slug: 'chapter-connections',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'paused', 'lastReachedAt'],
    group: 'Special request exchange',
    description:
      'Chapters this install exchanges special requests with. Send a partner the key generated here, and paste theirs into the field below.',
  },
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Regeneration is a checkbox rather than a button so that it works from
        // anywhere a document can be written. Ticking it replaces the secret and
        // clears itself, so the box is never left standing in the on position
        // waiting to surprise the next person who saves the record.
        if (data?.regenerateKey) {
          data.ourSecret = newSecret()
          data.regenerateKey = false
        }
        return data
      },
    ],
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
      name: 'ourKey',
      type: 'text',
      virtual: true,
      label: 'Our connection key',
      admin: {
        readOnly: true,
        description:
          'Send this to the other chapter. It carries our address, our name and the secret they will present, so it is the only thing they need. Treat it like a password: anyone holding it can read every shared special request here, with the contact details attached.',
      },
      hooks: {
        afterRead: [
          async ({ data, req }) => {
            if (!data?.ourSecret) return ''

            const origin = process.env.NEXT_PUBLIC_SERVER_URL
            if (!origin) return 'Set NEXT_PUBLIC_SERVER_URL before handing out a key.'

            try {
              return encodeConnectionKey({
                origin,
                secret: data.ourSecret,
                name: await chapterName(req.payload),
              })
            } catch (error) {
              // The only reason minting refuses is a plaintext origin, which is
              // a configuration problem the admin has to see rather than a key
              // to hand out quietly.
              return error instanceof Error ? error.message : 'Could not build a key.'
            }
          },
        ],
      },
    },
    {
      name: 'ourSecret',
      type: 'text',
      admin: {
        hidden: true,
        description: 'The raw secret behind our connection key.',
      },
      hooks: {
        // Minted here rather than in the admin UI so that a connection created
        // by any route — seed script, import, API — still has one.
        beforeValidate: [({ value }) => value || newSecret()],
      },
    },
    {
      name: 'regenerateKey',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Tick and save to replace our connection key. The old one stops working immediately, so tell the other chapter first — their side goes quiet until they paste the new one.',
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
      name: 'theirChapter',
      type: 'text',
      virtual: true,
      label: 'Their key points at',
      admin: {
        readOnly: true,
        description:
          'Read back out of the key above. A key nobody can read is a key nobody can check, so this is what we will actually call and what they call themselves.',
      },
      hooks: {
        afterRead: [
          ({ data }) => {
            if (!data?.theirKey) return ''
            const decoded = decodeConnectionKey(data.theirKey)
            return decoded ? `${decoded.name} — ${decoded.origin}` : 'Not a readable connection key.'
          },
        ],
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
