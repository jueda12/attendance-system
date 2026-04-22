import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'

export class AuthService {
  async login(username: string, password: string, ipAddress: string | null): Promise<string> {
    const user = await prisma.user.findUnique({ where: { username } })

    if (!user || user.status !== 'active') {
      throw new AppError('帳號或密碼錯誤', 401)
    }

    const valid = await argon2.verify(user.passwordHash, password)

    if (!valid) {
      throw new AppError('帳號或密碼錯誤', 401)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        failedLogins: 0,
        lockedUntil: null
      }
    })

    const options: SignOptions = {
      subject: user.id,
      expiresIn: env.jwtExpiresIn
    }

    return jwt.sign({ username: user.username, role: user.role }, env.jwtSecret, options)
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      throw new AppError('用戶不存在', 404)
    }

    return {
      id: user.id,
      username: user.username,
      nameZh: user.nameZh,
      role: user.role
    }
  }
}
