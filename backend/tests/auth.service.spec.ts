import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../src/utils/app-error.js'
import { AuthService } from '../src/services/auth.service.js'
import { prisma } from '../src/lib/prisma.js'
import jwt from 'jsonwebtoken'
import { hashPassword, verifyPassword } from '../src/utils/password.util.js'

vi.mock('../src/config/env.js', () => ({
  env: {
    jwtSecret: 'test-secret-not-changeme',
    jwtExpiresIn: '8h'
  }
}))

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn()
  }
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}))

vi.mock('../src/utils/password.util.js', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn()
}))

describe('auth service', () => {
  const service = new AuthService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns token and mustChangePwd from login', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      username: 'admin',
      nameZh: '系統管理員',
      role: 'admin',
      passwordHash: 'hash',
      mustChangePwd: true,
      status: 'active',
      failedLogins: 0,
      lockedUntil: null,
      lastLoginAt: null,
      lastLoginIp: null,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    vi.mocked(verifyPassword).mockResolvedValue(true)
    vi.mocked(jwt.sign).mockReturnValue('jwt-token' as never)

    const result = await service.login('admin', 'TempPass123!', '127.0.0.1')

    expect(result).toEqual({ token: 'jwt-token', mustChangePwd: true })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        lastLoginAt: expect.any(Date),
        lastLoginIp: '127.0.0.1',
        failedLogins: 0,
        lockedUntil: null
      }
    })
  })

  it('rejects same new password and current password', async () => {
    await expect(service.changePassword('u1', 'SamePwd123!', 'SamePwd123!')).rejects.toMatchObject<AppError>({
      message: 'NEW_PASSWORD_SAME_AS_OLD',
      statusCode: 400
    })
  })

  it('updates password hash and clears mustChangePwd when password is changed', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      username: 'admin',
      nameZh: '系統管理員',
      role: 'admin',
      passwordHash: 'old-hash',
      mustChangePwd: true,
      status: 'active',
      failedLogins: 0,
      lockedUntil: null,
      lastLoginAt: null,
      lastLoginIp: null,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    vi.mocked(verifyPassword).mockResolvedValue(true)
    vi.mocked(hashPassword).mockResolvedValue('new-hash')
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'u1',
      username: 'admin',
      nameZh: '系統管理員',
      role: 'admin',
      passwordHash: 'new-hash',
      mustChangePwd: false,
      status: 'active',
      failedLogins: 0,
      lockedUntil: null,
      lastLoginAt: null,
      lastLoginIp: null,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await service.changePassword('u1', 'OldPassword123!', 'NewPassword123!')

    expect(hashPassword).toHaveBeenCalledWith('NewPassword123!')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        passwordHash: 'new-hash',
        mustChangePwd: false
      }
    })
  })
})
