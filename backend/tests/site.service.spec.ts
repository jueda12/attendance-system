import { beforeEach, describe, expect, it, vi } from 'vitest'

const { siteCreate, siteFindFirst, siteFindMany, siteCount, siteUpdate, auditLogCreate, transaction } = vi.hoisted(() => ({
  siteCreate: vi.fn(),
  siteFindFirst: vi.fn(),
  siteFindMany: vi.fn(),
  siteCount: vi.fn(),
  siteUpdate: vi.fn(),
  auditLogCreate: vi.fn(),
  transaction: vi.fn()
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    site: {
      create: siteCreate,
      findFirst: siteFindFirst,
      findMany: siteFindMany,
      count: siteCount,
      update: siteUpdate
    },
    auditLog: {
      create: auditLogCreate
    },
    $transaction: transaction
  }
}))

import { SiteService } from '../src/services/master-data.service.js'

describe('SiteService', () => {
  const service = new SiteService()
  const actor = { id: 'user-1', username: 'admin', role: 'admin' }
  const meta = { ipAddress: '127.0.0.1', userAgent: 'vitest-agent' }
  const site = {
    id: 'site-1',
    code: 'SITE-001',
    nameZh: '中環地盤',
    address: '中環',
    startDate: new Date('2026-05-01T00:00:00.000Z'),
    endDate: null,
    pmName: null,
    status: 'active',
    remarks: null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z')
  }

  beforeEach(() => {
    siteCreate.mockReset()
    siteFindFirst.mockReset()
    siteFindMany.mockReset()
    siteCount.mockReset()
    siteUpdate.mockReset()
    auditLogCreate.mockReset()
    transaction.mockReset()
    transaction.mockImplementation(async (callback) =>
      callback({ site: { create: siteCreate, update: siteUpdate }, auditLog: { create: auditLogCreate } })
    )
  })

  it('creates a site and audit log in one transaction', async () => {
    siteCreate.mockResolvedValue(site)
    auditLogCreate.mockResolvedValue({})

    const result = await service.create({ code: 'SITE-001', nameZh: '中環地盤', startDate: site.startDate }, actor, meta)

    expect(result).toBe(site)
    expect(transaction).toHaveBeenCalledOnce()
    expect(siteCreate).toHaveBeenCalledWith({
      data: { code: 'SITE-001', nameZh: '中環地盤', startDate: site.startDate, status: 'active' }
    })
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        username: 'admin',
        action: 'create',
        entity: 'site',
        entityId: 'site-1',
        oldValue: null,
        newValue: JSON.stringify({
          code: 'SITE-001',
          nameZh: '中環地盤',
          address: '中環',
          startDate: '2026-05-01T00:00:00.000Z',
          endDate: null,
          pmName: null,
          status: 'active',
          remarks: null
        }),
        ipAddress: '127.0.0.1',
        userAgent: 'vitest-agent'
      })
    })
  })

  it('does not write audit log when create fails', async () => {
    siteCreate.mockRejectedValue(new Error('Unique constraint failed'))

    await expect(service.create({ code: 'SITE-001', nameZh: '中環地盤', startDate: site.startDate }, actor, meta)).rejects.toThrow(
      'Unique constraint failed'
    )
    expect(auditLogCreate).not.toHaveBeenCalled()
  })

  it('lists non-deleted sites by default', async () => {
    siteFindMany.mockResolvedValue([site])
    siteCount.mockResolvedValue(1)

    const result = await service.list()

    expect(result.meta).toEqual({ page: 1, limit: 50, total: 1 })
    expect(siteFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: { not: 'deleted' } } }))
    expect(siteCount).toHaveBeenCalledWith({ where: { status: { not: 'deleted' } } })
  })

  it('throws 404 when get misses or record is deleted', async () => {
    siteFindFirst.mockResolvedValue(null)

    await expect(service.get('site-1')).rejects.toMatchObject({ message: '地盤不存在', statusCode: 404 })
    expect(siteFindFirst).toHaveBeenCalledWith({ where: { id: 'site-1', status: { not: 'deleted' } } })
  })

  it('updates a site and audits changed fields only', async () => {
    const endDate = new Date('2026-06-01T00:00:00.000Z')
    siteFindFirst.mockResolvedValue(site)
    siteUpdate.mockResolvedValue({ ...site, endDate, status: 'closed' })
    auditLogCreate.mockResolvedValue({})

    await service.update('site-1', { endDate, status: 'closed' }, actor, meta)

    expect(siteUpdate).toHaveBeenCalledWith({ where: { id: 'site-1' }, data: { endDate, status: 'closed' } })
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'update',
        entity: 'site',
        oldValue: JSON.stringify({ endDate: null, status: 'active' }),
        newValue: JSON.stringify({ endDate: '2026-06-01T00:00:00.000Z', status: 'closed' })
      })
    })
  })

  it('writes update audit even when there is no field diff', async () => {
    siteFindFirst.mockResolvedValue(site)
    siteUpdate.mockResolvedValue(site)
    auditLogCreate.mockResolvedValue({})

    await service.update('site-1', { nameZh: '中環地盤' }, actor, meta)

    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ oldValue: '{}', newValue: '{}' })
    })
  })

  it('soft deletes by status and excludes deleted records from list/get', async () => {
    siteFindFirst.mockResolvedValue(site)
    siteUpdate.mockResolvedValue({ ...site, status: 'deleted' })
    auditLogCreate.mockResolvedValue({})

    await service.delete('site-1', actor, meta)

    expect(siteUpdate).toHaveBeenCalledWith({ where: { id: 'site-1' }, data: { status: 'deleted' } })
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'delete',
        entity: 'site',
        oldValue: expect.stringContaining('SITE-001'),
        newValue: JSON.stringify({ status: 'deleted' })
      })
    })
  })
})
