import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'
import { hashPassword, verifyPassword } from '../utils/password.util.js'
import { AuditService } from './audit.service.js'

const auditService = new AuditService()

type LoginResult = {
  token: string
  mustChangePwd: boolean
}

export class AuthService {
  async login(
    username: string,
    password: string,
    ipAddress: string | null,
    userAgent: string | null = null
  ): Promise<LoginResult> {
    const user = await prisma.user.findUnique({ where: { username } })

    if (!user || user.status !== 'active') {
      throw new AppError('帳號或密碼錯誤', 401)
    }

    const valid = await verifyPassword(user.passwordHash, password)

    if (!valid) {
      throw new AppError('帳號或密碼錯誤', 401)
    }

    const lastLoginAt = new Date()

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt,
          lastLoginIp: ipAddress,
          failedLogins: 0,
          lockedUntil: null
        }
      })

      await tx.auditLog.create({
        data: {
          userId: user.id,
          username: user.username,
          action: 'login',
          entity: 'auth',
          entityId: user.username,
          oldValue: null,
          newValue: JSON.stringify({ event: 'login_success', lastLoginAt: lastLoginAt.toISOString() }),
          ipAddress,
          userAgent,
          timestamp: lastLoginAt
        }
      })
    })

    const options: SignOptions = {
      subject: user.id,
      expiresIn: env.jwtExpiresIn
    }

    const token = jwt.sign({ username: user.username, role: user.role }, env.jwtSecret, options)

    return { token, mustChangePwd: user.mustChangePwd }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress: string | null = null,
    userAgent: string | null = null
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user || user.status !== 'active') {
      throw new AppError('未授權', 401)
    }

    const valid = await verifyPassword(user.passwordHash, currentPassword)

    if (!valid) {
      throw new AppError('INVALID_CURRENT_PASSWORD', 400)
    }

    const isSamePassword = await verifyPassword(user.passwordHash, newPassword)

    if (isSamePassword) {
      throw new AppError('NEW_PASSWORD_SAME_AS_OLD', 400)
    }

    const passwordHash = await hashPassword(newPassword)

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          mustChangePwd: false
        }
      })

      await tx.auditLog.create({
        data: {
          userId: user.id,
          username: user.username,
          action: 'password_change',
          entity: 'auth',
          entityId: user.id,
          oldValue: null,
          newValue: JSON.stringify({ passwordChanged: true, mustChangePwd: false }),
          ipAddress,
          userAgent
        }
      })
    })
  }

  async logout(userId: string, username: string, ipAddress: string | null, userAgent: string | null): Promise<void> {
    await auditService.create({
      userId,
      username,
      action: 'logout',
      entity: 'auth',
      entityId: userId,
      oldValue: null,
      newValue: JSON.stringify({ event: 'logout' }),
      ipAddress,
      userAgent
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
      role: user.role,
      mustChangePwd: user.mustChangePwd
    }
  }
}
