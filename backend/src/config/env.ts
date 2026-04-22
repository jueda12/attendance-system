import { config } from 'dotenv'
import type { SignOptions } from 'jsonwebtoken'

config()

const jwtSecret = process.env.JWT_SECRET
const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? '8h'

if (!jwtSecret || jwtSecret === 'changeme') {
  throw new Error('JWT_SECRET is required and must not be changeme')
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? 'file:./dev.db',
  jwtSecret,
  jwtExpiresIn: jwtExpiresIn as SignOptions['expiresIn']
}
