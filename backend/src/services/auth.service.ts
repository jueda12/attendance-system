import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'
import { hashPassword, verifyPassword } from '../utils/password.util.js'

type LoginResult = {
  token: string
  mustChangePwd: boolean
}

export class AuthService {
  async login(username: string, password: string, ipAddress: string | null): Promise<LoginResult> {
    const user = await prisma.user.findUnique({ where: { username } })

    if (!user || user.status !== 'active') {
      throw new AppError('帳號或密碼錯誤', 401)
    }

    const valid = await verifyPassword(user.passwordHash, password)

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

    return {
      token: jwt.sign({ username: user.username, role: user.role }, env.jwtSecret, options),
      mustChangePwd: user.mustChangePwd
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (newPassword === currentPassword) {
      throw new AppError('NEW_PASSWORD_SAME_AS_OLD', 400)
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      throw new AppError('用戶不存在', 404)
    }

    const valid = await verifyPassword(user.passwordHash, currentPassword)

    if (!valid) {
      throw new AppError('CURRENT_PASSWORD_INCORRECT', 400)
    }

    const passwordHash = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePwd: false
      }
    })
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
