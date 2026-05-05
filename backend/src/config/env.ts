import { config } from 'dotenv'
import type { SignOptions } from 'jsonwebtoken'
import { assertBase64Aes256Key } from '../utils/field-crypto.js'

config()

const jwtSecret = process.env.JWT_SECRET
const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? '8h'

if (!jwtSecret || jwtSecret === 'changeme') {
  throw new Error('JWT_SECRET is required and must not be changeme')
}

function assertNonEmptyEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? 'file:./dev.db',
  jwtSecret,
  jwtExpiresIn: jwtExpiresIn as SignOptions['expiresIn'],
  hkidEncryptionKey: assertBase64Aes256Key('HKID_ENCRYPTION_KEY', process.env.HKID_ENCRYPTION_KEY),
  bankEncryptionKey: assertBase64Aes256Key('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY),
  hkidKeyVersion: assertNonEmptyEnv('HKID_KEY_VERSION', process.env.HKID_KEY_VERSION),
  bankKeyVersion: assertNonEmptyEnv('BANK_KEY_VERSION', process.env.BANK_KEY_VERSION)
}
