import { createHash } from 'node:crypto'
import { env } from '../config/env.js'
import { AppError } from './app-error.js'
import { decryptField, encryptField } from './field-crypto.js'

const hkidPattern = /^[A-Z]{1,2}\d{6}[A0-9]$/

export function normalizeHkid(input: string): string {
  return input.replace(/\s/g, '').toUpperCase().replace(/[()]/g, '').replace(/-/g, '')
}

export function validateNormalizedHkid(normalized: string): void {
  if (!hkidPattern.test(normalized)) {
    throw new AppError('HKID 格式不正確', 400, { code: 'INVALID_HKID' })
  }
}

export function maskHkid(normalized: string): string {
  const checkDigit = normalized.at(-1)
  return `${normalized.slice(0, 4)}***(${checkDigit})`
}

export function hashHkid(normalized: string): string {
  return createHash('sha256').update(normalized).digest('hex')
}

export function encryptHkid(input: string): { normalized: string; masked: string; hash: string; encrypted: string } {
  const normalized = normalizeHkid(input)
  validateNormalizedHkid(normalized)

  return {
    normalized,
    masked: maskHkid(normalized),
    hash: hashHkid(normalized),
    encrypted: encryptField(normalized, env.hkidEncryptionKey, env.hkidKeyVersion)
  }
}

export function revealHkid(encrypted: string): string {
  return decryptField(encrypted, env.hkidEncryptionKey)
}
