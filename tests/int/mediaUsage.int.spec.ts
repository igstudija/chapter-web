import { describe, expect, it } from 'vitest'
import type { Field } from 'payload'
import { mediaFieldPaths, mediaIdsAtPaths } from '@/lib/mediaUsage'
import { mediaFilenames, variantFilenames } from '@/lib/mediaVariants'
import { SlideBlocks } from '@/collections/blocks/SlideBlocks'

describe('mediaFieldPaths', () => {
  it('finds upload fields at the top level, and ignores other relationships', () => {
    const fields = [
      { name: 'profileImage', type: 'upload', relationTo: 'media' },
      { name: 'slideImages', type: 'upload', relationTo: 'media', hasMany: true },
      { name: 'powerGroup', type: 'relationship', relationTo: 'power-groups' },
      { name: 'company', type: 'text' },
    ] as Field[]

    expect(mediaFieldPaths(fields)).toEqual(['profileImage', 'slideImages'])
  })

  it('reaches into arrays, groups and named tabs', () => {
    const fields = [
      {
        name: 'gallery',
        type: 'array',
        fields: [{ name: 'image', type: 'upload', relationTo: 'media' }],
      },
      {
        name: 'seo',
        type: 'group',
        fields: [{ name: 'ogImage', type: 'upload', relationTo: 'media' }],
      },
      {
        type: 'tabs',
        tabs: [
          { name: 'company', fields: [{ name: 'logo', type: 'upload', relationTo: 'media' }] },
          { label: 'Profile', fields: [{ name: 'photo', type: 'upload', relationTo: 'media' }] },
        ],
      },
    ] as Field[]

    // The unnamed tab contributes no segment — its children are stored, and
    // queried, as if they were declared beside it.
    expect(mediaFieldPaths(fields)).toEqual([
      'gallery.image',
      'seo.ogImage',
      'company.logo',
      'photo',
    ])
  })

  it('sees through presentational wrappers', () => {
    const fields = [
      {
        type: 'row',
        fields: [
          { name: 'logo', type: 'upload', relationTo: 'media' },
          { type: 'collapsible', label: 'More', fields: [{ name: 'icon', type: 'upload', relationTo: 'media' }] },
        ],
      },
    ] as Field[]

    expect(mediaFieldPaths(fields)).toEqual(['logo', 'icon'])
  })

  it('finds the image on a slide block, once, however many blocks declare it', () => {
    const fields = [{ name: 'slides', type: 'blocks', blocks: SlideBlocks }] as Field[]

    expect(mediaFieldPaths(fields)).toEqual(['slides.image'])
  })

  it('counts a polymorphic relationship that can point at media', () => {
    const fields = [
      { name: 'attachment', type: 'relationship', relationTo: ['media', 'blog'] },
    ] as Field[]

    expect(mediaFieldPaths(fields)).toEqual(['attachment'])
  })
})

describe('mediaIdsAtPaths', () => {
  it('reads ids however the relation arrives', () => {
    const doc = {
      slideImage: 7,
      profileImage: '8',
      logo: { id: 9, filename: 'logo.webp' },
      slideImages: [10, { id: 11 }],
    }

    expect([...mediaIdsAtPaths(doc, ['slideImage', 'profileImage', 'logo', 'slideImages'])]).toEqual(
      [7, 8, 9, 10, 11],
    )
  })

  it('reads through arrays of rows and blocks', () => {
    const doc = {
      gallery: [{ image: 1 }, { image: 2 }, { caption: 'no image here' }],
      slides: [{ blockType: 'customImage', image: 3 }, { blockType: 'guests' }],
    }

    expect([...mediaIdsAtPaths(doc, ['gallery.image', 'slides.image'])]).toEqual([1, 2, 3])
  })

  it('is empty for a document holding nothing', () => {
    expect(mediaIdsAtPaths({ slideImage: null, slideImages: [] }, ['slideImage', 'slideImages']))
      .toEqual(new Set())
  })

  it('does not invent an id from a path that is not there', () => {
    expect(mediaIdsAtPaths({}, ['a.b.c'])).toEqual(new Set())
  })
})

describe('variant filenames', () => {
  it('names every sized file written beside an original', () => {
    expect(variantFilenames('photo.webp')).toEqual([
      'photo-thumbnail.webp',
      'photo-card.webp',
      'photo-medium.webp',
    ])
  })

  it('includes the original when deleting, so nothing is left behind', () => {
    expect(mediaFilenames('photo.webp')).toHaveLength(4)
    expect(mediaFilenames('photo.webp')[0]).toBe('photo.webp')
  })

  it('handles a name with no extension', () => {
    expect(variantFilenames('photo')).toEqual(['photo-thumbnail', 'photo-card', 'photo-medium'])
  })
})
