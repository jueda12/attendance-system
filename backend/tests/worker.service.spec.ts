import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  workerCreate,
  workerFindFirst,
  workerFindMany,
  workerCount,
  workerUpdate,
  auditLogCreate,
  transaction
} = vi.hoisted(() => ({
  workerCreate: vi.fn(),
  workerFindFirst: vi.fn(),
  workerFindMany: vi.fn(),
  workerCount: vi.fn(),
  workerUpdate: vi.fn(),
  auditLogCreate: vi.fn(),
  transaction: vi.fn()
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    worker: {
      create: workerCreate,
      findFirst: workerFindFirst,
      findMany: workerFindMany,
      count: workerCount,
      update: workerUpdate
    },
    auditLog: {
      create: auditLogCreate
    },
    $transaction: transaction
  }
}))

vi.mock('../src/utils/hkid-crypto.js', () => ({
  encryptHkid: vi.fn(() => ({ normalized: 'A1234567', masked: 'A123***(7)', hash: 'hash-a1234567', encrypted: 'encrypted-hkid' })),
  revealHkid: vi.fn(() => 'A1234567')
}))

vi.mock('../src/utils/bank-crypto.js', () => ({
  encryptBankAccount: vi.fn((plain: string) => ({ masked: `****-${plain.slice(-4)}`, encrypted: `encrypted-${plain}` })),
  revealBankAccount: vi.fn(() => '1234560001')
}))

import { Prisma } from '@prisma/client'
import { createWorkerSchema, updateWorkerSchema } from '../src/controllers/worker.schemas.js'
import { WorkerService } from '../src/services/worker.service.js'

const actor = { id: 'user-1', username: 'admin', role: 'admin' }
const meta = { ipAddress: '127.0.0.1', userAgent: 'vitest-agent' }
const worker = {
  id: 'worker-1',
  workerCode: 'W0001',
  nameZh: '陳大文',
  nameEn: null,
  hkidMasked: 'A123***(7)',
  hkidHash: 'hash-a1234567',
  hkidEncrypted: 'encrypted-hkid',
  phone: null,
  address: null,
  joinDate: new Date('2026-05-01T00:00:00.000Z'),
  leaveDate: null,
  leaveReason: null,
  subcontractorId: 'sub-1',
  wageType: 'daily',
  wageAmount: new Prisma.Decimal(800),
  defaultDailyHours: new Prisma.Decimal(8),
  otMultiplier: new Prisma.Decimal(1),
  cwraNo: null,
  cwraExpiry: null,
  greenCardNo: null,
  greenCardExpiry: null,
  trades: null,
  mpfScheme: 'industry',
  mpfTrustee: null,
  mpfAccountNo: null,
  mpf60DayReviewed: false,
  mpf60DayReviewedAt: null,
  mpf60DayDecision: null,
  mpfSchemeChangedAt: null,
  bankName: 'HSBC',
  bankAccountEnc: 'encrypted-1234560001',
  bankAccountMasked: '****-0001',
  status: 'active',
  remarks: null,
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
  updatedAt: new Date('2026-05-01T00:00:00.000Z')
}

function createInput() {
  return {
    nameZh: '陳大文',
    hkid: 'A123456(7)',
    subcontractorId: 'sub-1',
    joinDate: new Date('2026-05-01T00:00:00.000Z'),
    wageType: 'daily' as const,
    wageAmount: 800,
    bankName: 'HSBC',
    bankAccount: '1234560001'
  }
}

describe('WorkerService', () => {
  const service = new WorkerService()

  beforeEach(() => {
    workerCreate.mockReset()
    workerFindFirst.mockReset()
    workerFindMany.mockReset()
    workerCount.mockReset()
    workerUpdate.mockReset()
    auditLogCreate.mockReset()
    transaction.mockReset()
    transaction.mockImplementation(async (callback) =>
      callback({ worker: { create: workerCreate, findFirst: workerFindFirst, update: workerUpdate }, auditLog: { create: auditLogCreate } })
    )
  })

  it('creates a worker with encrypted HKID and bank inside a transaction', async () => {
    workerFindFirst.mockResolvedValue(null)
    workerCreate.mockResolvedValue(worker)
    auditLogCreate.mockResolvedValue({})

    await service.create({ ...createInput(), workerCode: 'MAN-01' }, actor, meta)

    expect(transaction).toHaveBeenCalledOnce()
    expect(workerCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ hkidEncrypted: 'encrypted-hkid', bankAccountEnc: 'encrypted-1234560001', bankAccountMasked: '****-0001' })
    })
  })

  it('strips sensitive fields from create response', async () => {
    workerFindFirst.mockResolvedValue(null)
    workerCreate.mockResolvedValue(worker)
    auditLogCreate.mockResolvedValue({})

    const result = await service.create({ ...createInput(), workerCode: 'MAN-01' }, actor, meta)

    expect(result).not.toHaveProperty('hkidHash')
    expect(result).not.toHaveProperty('hkidEncrypted')
    expect(result).not.toHaveProperty('bankAccountEnc')
  })

  it('writes create audit without plaintext secrets', async () => {
    workerFindFirst.mockResolvedValue(null)
    workerCreate.mockResolvedValue(worker)
    auditLogCreate.mockResolvedValue({})

    await service.create({ ...createInput(), workerCode: 'MAN-01' }, actor, meta)

    const payload = JSON.stringify(auditLogCreate.mock.calls[0][0])
    expect(payload).toContain('A123***(7)')
    expect(payload).not.toContain('A1234567')
    expect(payload).not.toContain('1234560001')
    expect(payload).not.toContain('encrypted-hkid')
  })

  it('rejects duplicate active HKID in the same subcontractor', async () => {
    workerFindFirst.mockResolvedValue({ id: 'worker-existing' })

    await expect(service.create({ ...createInput(), workerCode: 'MAN-01' }, actor, meta)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('checks duplicate HKID within active same-subcontractor scope', async () => {
    workerFindFirst.mockResolvedValue(null)
    workerCreate.mockResolvedValue(worker)
    auditLogCreate.mockResolvedValue({})

    await service.create({ ...createInput(), workerCode: 'MAN-01' }, actor, meta)

    expect(workerFindFirst).toHaveBeenCalledWith({ where: { subcontractorId: 'sub-1', hkidHash: 'hash-a1234567', status: 'active' }, select: { id: true } })
  })

  it('allows create when duplicate lookup misses', async () => {
    workerFindFirst.mockResolvedValue(null)
    workerCreate.mockResolvedValue(worker)
    auditLogCreate.mockResolvedValue({})

    await expect(service.create({ ...createInput(), subcontractorId: 'sub-2', workerCode: 'MAN-01' }, actor, meta)).resolves.toMatchObject({ id: 'worker-1' })
  })

  it('creates with manual workerCode', async () => {
    workerFindFirst.mockResolvedValue(null)
    workerCreate.mockResolvedValue({ ...worker, workerCode: 'MAN-01' })
    auditLogCreate.mockResolvedValue({})

    await service.create({ ...createInput(), workerCode: 'MAN-01' }, actor, meta)

    expect(workerCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ workerCode: 'MAN-01' }) })
  })

  it('auto-generates W0001', async () => {
    workerFindMany.mockResolvedValue([])
    workerFindFirst.mockResolvedValue(null)
    workerCreate.mockResolvedValue(worker)
    auditLogCreate.mockResolvedValue({})

    await service.create(createInput(), actor, meta)

    expect(workerCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ workerCode: 'W0001' }) })
  })

  it('retries auto workerCode on P2002', async () => {
    workerFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ workerCode: 'W0001' }])
    workerFindFirst.mockResolvedValue(null)
    workerCreate
      .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '5.22.0', meta: { target: ['workerCode'] } }))
      .mockResolvedValueOnce({ ...worker, workerCode: 'W0002' })
    auditLogCreate.mockResolvedValue({})

    await service.create(createInput(), actor, meta)

    expect(workerCreate).toHaveBeenCalledTimes(2)
  })

  it('maps manual duplicate workerCode to 409 without retry', async () => {
    workerFindFirst.mockResolvedValue(null)
    workerCreate.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '5.22.0', meta: { target: ['workerCode'] } }))

    await expect(service.create({ ...createInput(), workerCode: 'MAN-01' }, actor, meta)).rejects.toMatchObject({ statusCode: 409 })
    expect(workerCreate).toHaveBeenCalledOnce()
  })

  it('lists non-deleted workers by default', async () => {
    workerFindMany.mockResolvedValue([worker])
    workerCount.mockResolvedValue(1)

    const result = await service.list()

    expect(result.meta).toEqual({ page: 1, limit: 50, total: 1 })
    expect(workerFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: { not: 'deleted' } } }))
  })

  it('gets non-deleted worker only', async () => {
    workerFindFirst.mockResolvedValue(worker)

    await service.get('worker-1')

    expect(workerFindFirst).toHaveBeenCalledWith({ where: { id: 'worker-1', status: { not: 'deleted' } } })
  })

  it('excludes HKID immutable fields from update schema', () => {
    expect(updateWorkerSchema.safeParse({ hkid: 'A1234567' }).success).toBe(false)
  })

  it('updates nameZh and audits changed field only', async () => {
    workerFindFirst.mockResolvedValue(worker)
    workerUpdate.mockResolvedValue({ ...worker, nameZh: '陳大文2' })
    auditLogCreate.mockResolvedValue({})

    await service.update('worker-1', { nameZh: '陳大文2' }, actor, meta)

    expect(auditLogCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ oldValue: JSON.stringify({ nameZh: '陳大文' }), newValue: JSON.stringify({ nameZh: '陳大文2' }) }) })
  })

  it('resets MPF 60-day fields when joinDate changes', async () => {
    const reviewed = { ...worker, mpf60DayReviewed: true, mpf60DayReviewedAt: new Date('2026-07-01T00:00:00.000Z'), mpf60DayDecision: 'keep_industry' }
    workerFindFirst.mockResolvedValue(reviewed)
    workerUpdate.mockResolvedValue({ ...reviewed, joinDate: new Date('2026-05-15T00:00:00.000Z'), mpf60DayReviewed: false })
    auditLogCreate.mockResolvedValue({})

    await service.update('worker-1', { joinDate: new Date('2026-05-15T00:00:00.000Z') }, actor, meta)

    expect(workerUpdate).toHaveBeenCalledWith({ where: { id: 'worker-1' }, data: expect.objectContaining({ mpf60DayReviewed: false, mpf60DayReviewedAt: null, mpf60DayDecision: null }) })
  })

  it('does not reset MPF 60-day fields when wageType changes', async () => {
    workerFindFirst.mockResolvedValue(worker)
    workerUpdate.mockResolvedValue({ ...worker, wageType: 'hourly' })
    auditLogCreate.mockResolvedValue({})

    await service.update('worker-1', { wageType: 'hourly' }, actor, meta)

    expect(workerUpdate.mock.calls[0][0].data).not.toHaveProperty('mpf60DayReviewed')
  })

  it('updates bank by encrypting new value and auditing only mask', async () => {
    workerFindFirst.mockResolvedValue(worker)
    workerUpdate.mockResolvedValue({ ...worker, bankAccountEnc: 'encrypted-99990001', bankAccountMasked: '****-0001' })
    auditLogCreate.mockResolvedValue({})

    await service.update('worker-1', { bankAccount: '99990001' }, actor, meta)

    const payload = JSON.stringify(auditLogCreate.mock.calls[0][0])
    expect(workerUpdate.mock.calls[0][0].data.bankAccountEnc).toBe('encrypted-99990001')
    expect(payload).not.toContain('99990001')
    expect(payload).not.toContain('encrypted-99990001')
  })

  it('soft deletes and audits sanitized snapshot', async () => {
    workerFindFirst.mockResolvedValue(worker)
    workerUpdate.mockResolvedValue({ ...worker, status: 'deleted' })
    auditLogCreate.mockResolvedValue({})

    await service.delete('worker-1', actor, meta)

    expect(workerUpdate).toHaveBeenCalledWith({ where: { id: 'worker-1' }, data: { status: 'deleted' } })
    expect(JSON.stringify(auditLogCreate.mock.calls[0][0])).not.toContain('encrypted-hkid')
  })

  it('reveals HKID and audits masked only', async () => {
    workerFindFirst.mockResolvedValue(worker)
    auditLogCreate.mockResolvedValue({})

    const result = await service.revealHkid('worker-1', actor, meta)

    expect(result).toEqual({ hkid: 'A1234567' })
    expect(JSON.stringify(auditLogCreate.mock.calls[0][0])).not.toContain('A1234567')
  })

  it('reveals bank and audits masked only', async () => {
    workerFindFirst.mockResolvedValue(worker)
    auditLogCreate.mockResolvedValue({})

    const result = await service.revealBank('worker-1', actor, meta)

    expect(result).toEqual({ bankAccount: '1234560001' })
    expect(JSON.stringify(auditLogCreate.mock.calls[0][0])).not.toContain('1234560001')
  })

  it('returns error when revealing missing bank account', async () => {
    workerFindFirst.mockResolvedValue({ ...worker, bankAccountEnc: null })

    await expect(service.revealBank('worker-1', actor, meta)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('does not accept Phase 2c MPF fields in create/update schemas', () => {
    const forbidden = {
      mpfTrustee: 'AIA',
      mpfAccountNo: 'MPF-1',
      mpfSchemeChangedAt: new Date(),
      mpf60DayReviewedAt: new Date(),
      mpf60DayDecision: 'keep_industry'
    }
    expect(createWorkerSchema.safeParse({ ...createInput(), ...forbidden }).success).toBe(false)
    expect(updateWorkerSchema.safeParse({ nameZh: '陳大文2', ...forbidden }).success).toBe(false)
  })
})
