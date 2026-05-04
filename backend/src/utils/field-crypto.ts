import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export type EncryptedFieldVersion = string

function decodeKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, 'base64')
  if (key.length !== 32) {
    throw new Error('Encryption key must decode to 32 bytes')
  }
  return key
}

export function assertBase64Aes256Key(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is required`)
  }

  const key = decodeKey(value)
  if (value === 'changeme' || key.equals(Buffer.alloc(32))) {
    throw new Error(`${name} is set to an insecure value`)
  }

  return value
}

export function encryptField(plainText: string, base64Key: string, version: EncryptedFieldVersion): string {
  const key = decodeKey(base64Key)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [version, iv.toString('base64'), ciphertext.toString('base64'), authTag.toString('base64')].join(':')
}

export function decryptField(payload: string, base64Key: string): string {
  const [version, ivBase64, ciphertextBase64, authTagBase64, extra] = payload.split(':')
  if (extra !== undefined || !version || !ivBase64 || !ciphertextBase64 || !authTagBase64) {
    throw new Error('Invalid encrypted field payload')
  }

  try {
    const key = decodeKey(base64Key)
    const iv = Buffer.from(ivBase64, 'base64')
    const ciphertext = Buffer.from(ciphertextBase64, 'base64')
    const authTag = Buffer.from(authTagBase64, 'base64')

    if (iv.length !== 12 || authTag.length !== 16 || ciphertext.length === 0) {
      throw new Error('Invalid encrypted field payload')
    }

    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch {
    throw new Error('Invalid encrypted field payload')
  }
}
