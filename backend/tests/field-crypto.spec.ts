import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { assertBase64Aes256Key, decryptField, encryptField } from '../src/utils/field-crypto.js'

const key = randomBytes(32).toString('base64')

function tamper(payload: string): string {
  const parts = payload.split(':')
  parts[3] = randomBytes(16).toString('base64')
  return parts.join(':')
}

describe('field crypto', () => {
  it('accepts a 32-byte base64 key', () => {
    expect(assertBase64Aes256Key('TEST_KEY', key)).toBe(key)
  })

  it('rejects missing key', () => {
    expect(() => assertBase64Aes256Key('TEST_KEY', undefined)).toThrow('TEST_KEY is required')
  })

  it('rejects wrong length key', () => {
    expect(() => assertBase64Aes256Key('TEST_KEY', randomBytes(16).toString('base64'))).toThrow('Encryption key must decode to 32 bytes')
  })

  it('rejects changeme', () => {
    expect(() => assertBase64Aes256Key('TEST_KEY', 'changeme')).toThrow('Encryption key must decode to 32 bytes')
  })

  it('rejects all-zero decoded key', () => {
    expect(() => assertBase64Aes256Key('TEST_KEY', Buffer.alloc(32).toString('base64'))).toThrow('TEST_KEY is set to an insecure value')
  })

  it('encrypts and decrypts a value', () => {
    const payload = encryptField('secret', key, 'v1')
    expect(decryptField(payload, key)).toBe('secret')
  })

  it('uses a random IV for each encryption', () => {
    expect(encryptField('secret', key, 'v1')).not.toBe(encryptField('secret', key, 'v1'))
  })

  it('writes a four-part payload', () => {
    expect(encryptField('secret', key, 'v1').split(':')).toHaveLength(4)
  })

  it('writes the supplied version into the payload', () => {
    expect(encryptField('secret', key, 'v2').startsWith('v2:')).toBe(true)
  })

  it('decrypts payloads using their embedded version', () => {
    expect(decryptField(encryptField('secret', key, 'v2'), key)).toBe('secret')
  })

  it('rejects malformed payload', () => {
    expect(() => decryptField('bad-payload', key)).toThrow('Invalid encrypted field payload')
  })

  it('rejects tampered auth tag', () => {
    expect(() => decryptField(tamper(encryptField('secret', key, 'v1')), key)).toThrow('Invalid encrypted field payload')
  })

  it('does not leak key details on decrypt failure', () => {
    expect(() => decryptField(tamper(encryptField('secret', key, 'v1')), key)).toThrow('Invalid encrypted field payload')
  })
})
