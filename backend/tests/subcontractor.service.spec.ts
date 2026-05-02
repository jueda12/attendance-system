import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  subcontractorCreate,
  subcontractorFindFirst,
  subcontractorFindMany,
  subcontractorCount,
  subcontractorUpdate,
  auditLogCreate,
  transaction
} = vi.hoisted(() => ({
  subcontractorCreate: vi.fn(),
  subcontractorFindFirst: vi.fn(),
  subcontractorFindMany: vi.fn(),
  subcontractorCount: vi.fn(),
  subcontractorUpdate: vi.fn(),
  auditLogCreate: vi.fn(),
  transaction: vi.fn()
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    subcontractor: {
      create: subcontractorCreate,
      findFirst: subcontractorFindFirst,
      findMany: subcontractorFindMany,
      count: subcontractorCount,
      update: subcontractorUpdate
    },
    auditLog: {
      create: auditLogCreate
    },
    $transaction: transaction
  }
}))

import { SubcontractorService } from '../src/services/master-data.service.js'

describe('SubcontractorService', () => {
  const service = new SubcontractorService()
  const actor = { id: 'user-1', username: 'admin', role: 'admin' }
  const meta = { ipAddress: '127.0.0.1', userAgent: 'vitest-agent' }
  const subcontractor = {
    id: 'sub-1',
    code: 'SUB-A',
    nameZh: '分判商 A',
    nameEn: null,
    brNo: null,
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    status: 'active',
    remarks: null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z')
  }

  beforeEach(() => {
    subcontractorCreate.mockReset()
    subcontractorFindFirst.mockReset()
    subcontractorFindMany.mockReset()
    subcontractorCount.mockReset()
    subcontractorUpdate.mockReset()
    auditLogCreate.mockReset()
    transaction.mockReset()
    transaction.mockImplementation(async (callback) =>
      callback({ subcontractor: { create: subcontractorCreate, update: subcontractorUpdate }, auditLog: { create: auditLogCreate } })
    )
  })

  it('creates a subcontractor and audit log in one transaction', async () => {
    subcontractorCreate.mockResolvedValue(subcontractor)
    auditLogCreate.mockResolvedValue({})

    const result = await service.create({ code: 'SUB-A', nameZh: '分判商 A' }, actor, meta)

    expect(result).toBe(subcontractor)
    expect(transaction).toHaveBeenCalledOnce()
    expect(subcontractorCreate).toHaveBeenCalledWith({ data: { code: 'SUB-A', nameZh: '分判商 A', status: 'active' } })
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        username: 'admin',
        action: 'create',
        entity: 'subcontractor',
        entityId: 'sub-1',
        oldValue: null,
        newValue: JSON.stringify({
          code: 'SUB-A',
          nameZh: '分判商 A',
          nameEn: null,
          brNo: null,
          contactName: null,
          contactPhone: null,
          contactEmail: null,
          status: 'active',
          remarks: null
        }),
        ipAddress: '127.0.0.1',
        userAgent: 'vitest-agent'
      })
    })
  })

  it('does not write audit log when create fails', async () => {
    subcontractorCreate.mockRejectedValue(new Error('Unique constraint failed'))

    await expect(service.create({ code: 'SUB-A', nameZh: '分判商 A' }, actor, meta)).rejects.toThrow('Unique constraint failed')
    expect(auditLogCreate).not.toHaveBeenCalled()
  })

  it('lists non-deleted subcontractors by default', async () => {
    subcontractorFindMany.mockResolvedValue([subcontractor])
    subcontractorCount.mockResolvedValue(1)

    const result = await service.list()

    expect(result.meta).toEqual({ page: 1, limit: 50, total: 1 })
    expect(subcontractorFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: { not: 'deleted' } } }))
    expect(subcontractorCount).toHaveBeenCalledWith({ where: { status: { not: 'deleted' } } })
  })

  it('throws 404 when get misses or record is deleted', async () => {
    subcontractorFindFirst.mockResolvedValue(null)

    await expect(service.get('sub-1')).rejects.toMatchObject({ message: '分判商不存在', statusCode: 404 })
    expect(subcontractorFindFirst).toHaveBeenCalledWith({ where: { id: 'sub-1', status: { not: 'deleted' } } })
  })

  it('updates a subcontractor and audits changed fields only', async () => {
    subcontractorFindFirst.mockResolvedValue(subcontractor)
    subcontractorUpdate.mockResolvedValue({ ...subcontractor, nameZh: '分判商 A2', status: 'inactive' })
    auditLogCreate.mockResolvedValue({})

    await service.update('sub-1', { nameZh: '分判商 A2', status: 'inactive' }, actor, meta)

    expect(subcontractorUpdate).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { nameZh: '分判商 A2', status: 'inactive' } })
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'update',
        entity: 'subcontractor',
        oldValue: JSON.stringify({ nameZh: '分判商 A', status: 'active' }),
        newValue: JSON.stringify({ nameZh: '分判商 A2', status: 'inactive' })
      })
    })
  })

  it('writes update audit even when there is no field diff', async () => {
    subcontractorFindFirst.mockResolvedValue(subcontractor)
    subcontractorUpdate.mockResolvedValue(subcontractor)
    auditLogCreate.mockResolvedValue({})

    await service.update('sub-1', { nameZh: '分判商 A' }, actor, meta)

    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ oldValue: '{}', newValue: '{}' })
    })
  })

  it('soft deletes by status and excludes deleted records from list/get', async () => {
    subcontractorFindFirst.mockResolvedValue(subcontractor)
    subcontractorUpdate.mockResolvedValue({ ...subcontractor, status: 'deleted' })
    auditLogCreate.mockResolvedValue({})

    await service.delete('sub-1', actor, meta)

    expect(subcontractorUpdate).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { status: 'deleted' } })
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'delete',
        entity: 'subcontractor',
        oldValue: expect.stringContaining('SUB-A'),
        newValue: JSON.stringify({ status: 'deleted' })
      })
    })
  })
})
