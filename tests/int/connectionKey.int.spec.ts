import { describe, expect, it } from 'vitest'
import { encodeConnectionKey, decodeConnectionKey } from '@/lib/chapterExchange/connectionKey'

describe('connection key', () => {
  it('carries an origin, a secret and a chapter name through a round trip', () => {
    const key = encodeConnectionKey({
      origin: 'https://riga.example.org',
      secret: 'a-shared-secret',
      name: 'Riga Chapter',
    })

    expect(decodeConnectionKey(key)).toEqual({
      origin: 'https://riga.example.org',
      secret: 'a-shared-secret',
      name: 'Riga Chapter',
    })
  })

  // Whatever a Self-hoster pastes into the field lands here: half a key, an
  // email signature wrapped around one, a URL, an empty string. None of that is
  // exceptional enough to throw over — the admin needs to say "that is not a
  // connection key", which it can only do if this returns.
  it.each([
    ['an empty string', ''],
    ['a key without the prefix', 'eyJvcmlnaW4iOiJodHRwczovL3JpZ2EuZXhhbXBsZS5vcmcifQ'],
    ['rubbish after the prefix', 'chx_not-base64-at-all-!!'],
    ['base64 that is not JSON', 'chx_aGVsbG8gdGhlcmU'],
    ['JSON that is not an object', 'chx_WzEsMiwzXQ'],
    ['an object missing the secret', 'chx_eyJvcmlnaW4iOiJodHRwczovL2EudGVzdCIsIm5hbWUiOiJBIn0'],
  ])('refuses %s', (_case, key) => {
    expect(decodeConnectionKey(key)).toBeNull()
  })

  it('keeps a chapter name that is not ASCII intact', () => {
    const key = encodeConnectionKey({
      origin: 'https://liepaja.example.org',
      secret: 's',
      name: 'Liepājas Chapter',
    })

    expect(decodeConnectionKey(key)?.name).toBe('Liepājas Chapter')
  })

  // NEXT_PUBLIC_SERVER_URL is written by hand and often carries a path or a
  // trailing slash. The origin is what gets concatenated with the endpoint
  // path, so it is reduced to scheme, host and port before it is minted.
  it.each([
    ['https://riga.example.org/', 'https://riga.example.org'],
    ['https://riga.example.org/members/', 'https://riga.example.org'],
    ['https://riga.example.org:8443', 'https://riga.example.org:8443'],
  ])('reduces %s to its origin', (given, expected) => {
    const key = encodeConnectionKey({ origin: given, secret: 's', name: 'Riga' })

    expect(decodeConnectionKey(key)?.origin).toBe(expected)
  })

  // The secret travels in an Authorization header, so a plaintext origin would
  // hand it to anyone on the path. Localhost is the exception that lets two
  // installs on one machine be linked while developing.
  it('refuses to mint a key for a plaintext origin', () => {
    expect(() => encodeConnectionKey({ origin: 'http://riga.example.org', secret: 's', name: 'R' }))
      .toThrow()
  })

  it('mints a key for a plaintext localhost origin', () => {
    const key = encodeConnectionKey({ origin: 'http://localhost:3050', secret: 's', name: 'Dev' })

    expect(decodeConnectionKey(key)?.origin).toBe('http://localhost:3050')
  })

  // A key arrives from someone else's install, which may be running anything.
  // These are minted the way a partner would rather than by our own encoder,
  // so that the reading side is what is under test.
  const forge = (contents: Record<string, string>) =>
    'chx_' + Buffer.from(JSON.stringify(contents), 'utf8').toString('base64url')

  it.each([
    ['a plaintext origin', { origin: 'http://riga.example.org', secret: 's', name: 'R' }],
    ['an origin with no scheme', { origin: 'riga.example.org', secret: 's', name: 'R' }],
    ['an origin that is not a URL', { origin: 'not a url', secret: 's', name: 'R' }],
  ])('refuses a key carrying %s', (_case, contents) => {
    expect(decodeConnectionKey(forge(contents))).toBeNull()
  })
})
