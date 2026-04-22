import { config } from 'dotenv'

config()

const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret || jwtSecret === 'changeme') {
  throw new Error('JWT_SECRET is required and must not be changeme')
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? 'file:./dev.db',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h'
}
