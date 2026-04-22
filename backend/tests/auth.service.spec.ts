import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findUnique, update, hashPassword, verifyPassword } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn()
}))

vi.mock('../src/config/env.js', () => ({
  env: {
    jwtSecret: 'test-secret',
    jwtExpiresIn: '8h'
  }
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique,
      update
    }
  }
}))

vi.mock('../src/utils/password.util.js', () => ({
  hashPassword,
  verifyPassword
}))

import { AuthService } from '../src/services/auth.service.js'

describe('AuthService', () => {
  const service = new AuthService()

  beforeEach(() => {
    findUnique.mockReset()
    update.mockReset()
    hashPassword.mockReset()
    verifyPassword.mockReset()
  })

  it('returns token and mustChangePwd on login', async () => {
    findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'admin',
      role: 'admin',
      status: 'active',
      passwordHash: 'hash',
      mustChangePwd: true
    })
    verifyPassword.mockResolvedValue(true)
    update.mockResolvedValue({})

    const result = await service.login('admin', 'TempPass123!', '127.0.0.1')

    expect(result.mustChangePwd).toBe(true)
    expect(result.token).toEqual(expect.any(String))
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ failedLogins: 0 })
      })
    )
  })

  it('throws 400 when new password equals current password', async () => {
    findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'admin',
      role: 'admin',
      status: 'active',
      passwordHash: 'old-hash',
      mustChangePwd: true
    })
    verifyPassword.mockResolvedValue(true)

    await expect(service.changePassword('user-1', 'SamePass123!', 'SamePass123!')).rejects.toMatchObject({
      message: 'NEW_PASSWORD_SAME_AS_OLD',
      statusCode: 400
    })
  })

  it('updates hash and clears mustChangePwd on successful change', async () => {
    findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'admin',
      role: 'admin',
      status: 'active',
      passwordHash: 'old-hash',
      mustChangePwd: true
    })
    verifyPassword.mockResolvedValue(true)
    hashPassword.mockResolvedValue('new-hash')
    update.mockResolvedValue({})

    await service.changePassword('user-1', 'TempPass123!', 'NewTempPass123!')

    expect(hashPassword).toHaveBeenCalledWith('NewTempPass123!')
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        passwordHash: 'new-hash',
        mustChangePwd: false
      }
    })
  })
})
