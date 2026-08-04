import { describe, expect, it, vi, beforeEach } from 'vitest'

const revalidateTag = vi.fn()
const unstable_cache = vi.fn(
  (fn: (...args: unknown[]) => unknown, _keys: string[], _opts: unknown) => fn,
)

vi.mock('next/cache', () => ({
  revalidateTag: (tag: string) => revalidateTag(tag),
  unstable_cache: (fn: (...args: unknown[]) => unknown, keys: string[], opts: unknown) =>
    unstable_cache(fn, keys, opts),
}))

const { cacheTagFor, cachedRead, revalidateOnChange } = await import('@/lib/contentCache')

beforeEach(() => {
  revalidateTag.mockClear()
  unstable_cache.mockClear()
})

describe('cachedRead', () => {
  it('files an entry under every collection it depends on', async () => {
    // A read that joins two collections has to be dropped when either moves,
    // or it outlives the half that changed.
    cachedRead(async () => 'result', ['key'], ['blog', 'settings'])

    const [, keys, options] = unstable_cache.mock.calls[0]
    expect(keys).toEqual(['key'])
    expect(options).toEqual({ tags: ['collection:blog', 'collection:settings'] })
  })

  it('returns what the wrapped read returns', async () => {
    const read = cachedRead(async (n: number) => n * 2, ['double'], ['blog'])

    await expect(read(21)).resolves.toBe(42)
  })
})

describe('revalidateOnChange', () => {
  it('drops the collection’s entries after a save', () => {
    const hooks = revalidateOnChange('settings')

    hooks.afterChange[0]({ doc: { id: 1 } } as never)

    expect(revalidateTag).toHaveBeenCalledWith(cacheTagFor('settings'))
  })

  it('drops them after a delete too', () => {
    // A removed post changes what a list returns exactly as much as an edited
    // one does. Without this half it stays on the front page until something
    // else happens to be saved.
    const hooks = revalidateOnChange('blog')

    hooks.afterDelete[0]({ doc: { id: 1 } } as never)

    expect(revalidateTag).toHaveBeenCalledWith(cacheTagFor('blog'))
  })

  it('passes the document through untouched', () => {
    // Payload threads the return value on to the next hook; swallowing it
    // would quietly break anything registered after this one.
    const doc = { id: 7, title: 'unchanged' }
    const hooks = revalidateOnChange('blog')

    expect(hooks.afterChange[0]({ doc } as never)).toBe(doc)
    expect(hooks.afterDelete[0]({ doc } as never)).toBe(doc)
  })

  it('keeps one collection’s tag out of another’s', () => {
    revalidateOnChange('events').afterChange[0]({ doc: {} } as never)

    expect(revalidateTag).toHaveBeenCalledWith('collection:events')
    expect(revalidateTag).not.toHaveBeenCalledWith('collection:blog')
  })
})
