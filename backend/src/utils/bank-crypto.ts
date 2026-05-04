import { env } from '../config/env.js'
import { decryptField, encryptField } from './field-crypto.js'

export function maskBankAccount(plain: string): string {
  return `****-${plain.replace(/[-\s]/g, '').slice(-4)}`
}

export function encryptBankAccount(plain: string): { masked: string; encrypted: string } {
  return {
    masked: maskBankAccount(plain),
    encrypted: encryptField(plain, env.bankEncryptionKey, env.bankKeyVersion)
  }
}

export function revealBankAccount(encrypted: string): string {
  return decryptField(encrypted, env.bankEncryptionKey)
}
