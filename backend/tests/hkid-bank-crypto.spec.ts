import { randomBytes } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const testKey = randomBytes(32).toString('base64')

vi.mock('../src/config/env.js', () => ({
  env: {
    hkidEncryptionKey: testKey,
    bankEncryptionKey: testKey,
    hkidKeyVersion: 'v2',
    bankKeyVersion: 'v3'
  }
}))

const hkidCrypto = await import('../src/utils/hkid-crypto.js')
const bankCrypto = await import('../src/utils/bank-crypto.js')

describe('HKID and bank crypto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes HKID by removing spaces', () => {
    expect(hkidCrypto.normalizeHkid('A 123456 7')).toBe('A1234567')
  })

  it('uppercases HKID', () => {
    expect(hkidCrypto.normalizeHkid('a1234567')).toBe('A1234567')
  })

  it('removes brackets', () => {
    expect(hkidCrypto.normalizeHkid('A123456(7)')).toBe('A1234567')
  })

  it('removes hyphen', () => {
    expect(hkidCrypto.normalizeHkid('A123456-7')).toBe('A1234567')
  })

  it('accepts valid normalized HKID', () => {
    expect(() => hkidCrypto.validateNormalizedHkid('A1234567')).not.toThrow()
  })

  it('rejects invalid HKID', () => {
    expect(() => hkidCrypto.validateNormalizedHkid('BAD')).toThrow('HKID 格式不正確')
  })

  it('masks HKID', () => {
    expect(hkidCrypto.maskHkid('A1234567')).toBe('A123***(7)')
  })

  it('hashes HKID deterministically', () => {
    expect(hkidCrypto.hashHkid('A1234567')).toBe(hkidCrypto.hashHkid('A1234567'))
    expect(hkidCrypto.hashHkid('A1234567')).not.toContain('A1234567')
  })

  it('encrypts HKID with configured key version and reveals HKID', () => {
    const encrypted = hkidCrypto.encryptHkid('A123456(7)')
    expect(encrypted.encrypted.startsWith('v2:')).toBe(true)
    expect(hkidCrypto.revealHkid(encrypted.encrypted)).toBe('A1234567')
  })

  it('masks bank account', () => {
    expect(bankCrypto.maskBankAccount('123-456 0001')).toBe('****-0001')
  })

  it('encrypts bank account with configured key version and reveals bank account', () => {
    const encrypted = bankCrypto.encryptBankAccount('123-456 0001')
    expect(encrypted.encrypted.startsWith('v3:')).toBe(true)
    expect(bankCrypto.revealBankAccount(encrypted.encrypted)).toBe('123-456 0001')
  })

  it('does not include plaintext in encrypted payload', () => {
    expect(bankCrypto.encryptBankAccount('1234560001').encrypted).not.toContain('1234560001')
  })
})
