import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findUnique, update, auditLogCreate, transaction, hashPassword, verifyPassword } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  auditLogCreate: vi.fn(),
  transaction: vi.fn(),
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
    },
    auditLog: {
      create: auditLogCreate
    },
    $transaction: transaction
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
    auditLogCreate.mockReset()
    transaction.mockReset()
    hashPassword.mockReset()
    verifyPassword.mockReset()
    transaction.mockImplementation(async (callback) => callback({ user: { update }, auditLog: { create: auditLogCreate } }))
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
    auditLogCreate.mockResolvedValue({})

    const before = Date.now()
    const result = await service.login('admin', 'TempPass123!', '127.0.0.1', 'vitest-agent')
    const after = Date.now()

    expect(result.mustChangePwd).toBe(true)
    expect(result.token).toEqual(expect.any(String))
    expect(transaction).toHaveBeenCalledOnce()
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          lastLoginAt: expect.any(Date),
          lastLoginIp: '127.0.0.1',
          failedLogins: 0,
          lockedUntil: null
        })
      })
    )

    const lastLoginAt = update.mock.calls[0][0].data.lastLoginAt as Date
    expect(lastLoginAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(lastLoginAt.getTime()).toBeLessThanOrEqual(after)
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        username: 'admin',
        action: 'login',
        entity: 'auth',
        entityId: 'admin',
        oldValue: null,
        newValue: JSON.stringify({ event: 'login_success', lastLoginAt: lastLoginAt.toISOString() }),
        ipAddress: '127.0.0.1',
        userAgent: 'vitest-agent',
        timestamp: lastLoginAt
      })
    })
  })

  it('does not update lastLoginAt when login password is invalid', async () => {
    findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'admin',
      role: 'admin',
      status: 'active',
      passwordHash: 'hash',
      mustChangePwd: true
    })
    verifyPassword.mockResolvedValue(false)

    await expect(service.login('admin', 'WrongPass123!', '127.0.0.1')).rejects.toMatchObject({
      message: '帳號或密碼錯誤',
      statusCode: 401
    })
    expect(transaction).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(auditLogCreate).not.toHaveBeenCalled()
  })

  it('keeps login user update and audit write in one transaction', async () => {
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
    auditLogCreate.mockRejectedValue(new Error('audit failed'))

    await expect(service.login('admin', 'TempPass123!', '127.0.0.1')).rejects.toThrow('audit failed')
    expect(transaction).toHaveBeenCalledOnce()
    expect(update).toHaveBeenCalledOnce()
    expect(auditLogCreate).toHaveBeenCalledOnce()
  })

  it('throws 400 when current password is invalid', async () => {
    findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'admin',
      role: 'admin',
      status: 'active',
      passwordHash: 'old-hash',
      mustChangePwd: true
    })
    verifyPassword.mockResolvedValue(false)

    await expect(service.changePassword('user-1', 'WrongPass123!', 'NewTempPass123!')).rejects.toMatchObject({
      message: 'INVALID_CURRENT_PASSWORD',
      statusCode: 400
    })
    expect(hashPassword).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
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
    verifyPassword.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
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
