// @vitest-environment jsdom
import React from 'react'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SpecialRequestsGrid } from '@/components/SpecialRequestsGrid'
import { TranslationsProvider } from '@/components/TranslationsProvider'
import en from '@/messages/en.json'

afterEach(cleanup)

/**
 * The chapter filter, and the promise that came with it: search, paging and
 * grouping by member keep working exactly as they did (ADR 0007).
 */
const LABELS = {
  searchPlaceholder: 'Search',
  show: 'Show',
  ofEntries: 'of',
  noRequests: 'No requests',
  unknown: 'Unknown',
  added: 'Added',
  updated: 'Updated',
  regNumber: 'Reg. Nr.',
  requestSingular: 'request',
  requestPlural: 'requests',
  viewAll: 'View all',
  expand: 'Expand',
  collapse: 'Collapse',
  allRequests: 'All requests',
  allChapters: 'All chapters',
}

const request = (
  id: string,
  text: string,
  requester: { id: string; name: string; surname: string },
  chapterName?: string,
) => ({
  id,
  request: text,
  registrationNumber: null,
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
  requestedBy: { ...requester, email: `${requester.id}@example.org` },
  ...(chapterName ? { chapterName } : {}),
})

const ours = request('1', 'local logistics', { id: '1', name: 'Anna', surname: 'Ozola' })
const theirs = request(
  'Riga Chapter#1',
  'partner accounting',
  { id: 'Riga Chapter#7', name: 'Janis', surname: 'Berzins' },
  'Riga Chapter',
)

// The grid's search and pagination children read their own copy from context.
const renderGrid = (requests: ReturnType<typeof request>[]) =>
  render(
    React.createElement(TranslationsProvider, {
      messages: en as never,
      children: React.createElement(SpecialRequestsGrid, {
        requests,
        membershipByUserId: {},
        labels: LABELS,
        locale: 'en',
        ourChapterName: 'Our Chapter',
      }),
    }),
  )

describe('the chapter filter', () => {
  it('is not offered when there is only this chapter', () => {
    renderGrid([ours])

    expect(screen.queryByText('All chapters')).toBeNull()
  })

  it('offers this chapter and every chapter that sent something', () => {
    renderGrid([ours, theirs])

    expect(screen.getByRole('button', { name: 'All chapters' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Our Chapter' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Riga Chapter' })).toBeTruthy()
  })

  it('shows everything until a chapter is chosen', () => {
    renderGrid([ours, theirs])

    expect(screen.getByText('local logistics')).toBeTruthy()
    expect(screen.getByText('partner accounting')).toBeTruthy()
  })

  it('narrows to the chosen chapter', () => {
    renderGrid([ours, theirs])

    fireEvent.click(screen.getByRole('button', { name: 'Riga Chapter' }))

    expect(screen.queryByText('local logistics')).toBeNull()
    expect(screen.getByText('partner accounting')).toBeTruthy()
  })

  it('goes back to everything', () => {
    renderGrid([ours, theirs])

    fireEvent.click(screen.getByRole('button', { name: 'Riga Chapter' }))
    fireEvent.click(screen.getByRole('button', { name: 'All chapters' }))

    expect(screen.getByText('local logistics')).toBeTruthy()
  })

  // Search was there before this feature and has to keep working across the
  // merged set, and within a narrowed one.
  it('searches across every chapter, and within one', () => {
    renderGrid([ours, theirs])
    const search = screen.getByPlaceholderText('Search') as HTMLInputElement

    fireEvent.change(search, { target: { value: 'accounting' } })
    expect(screen.queryByText('local logistics')).toBeNull()
    expect(screen.getByText('partner accounting')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Our Chapter' }))
    expect(screen.queryByText('partner accounting')).toBeNull()
  })

  // Two chapters number their people from one. Grouping is by requester id, so
  // a shared id must not collapse two strangers into one row.
  it('keeps a partner’s member separate from ours', () => {
    renderGrid([ours, theirs])

    expect(screen.getByText(/Anna/)).toBeTruthy()
    expect(screen.getByText(/Janis/)).toBeTruthy()
  })

  it('marks a partner’s row with the chapter it came from, and leaves ours unmarked', () => {
    const { container } = renderGrid([ours, theirs])

    const badges = within(container).getAllByText('Riga Chapter')
    // One is the filter button, one is the badge on the card.
    expect(badges.length).toBeGreaterThan(1)
    expect(within(container).queryAllByText('Our Chapter')).toHaveLength(1)
  })
})
