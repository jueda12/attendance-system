import jwt from 'jsonwebtoken'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.JWT_SECRET = 'test-secret'
process.env.HKID_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
process.env.ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('base64')
process.env.HKID_KEY_VERSION = 'v1'
process.env.BANK_KEY_VERSION = 'v1'

const auditRows: Array<{ action: string; entity: string; entityId: string | null; oldValue: string | null; newValue: string | null }> = []
let workerRecord: Record<string, unknown> | null = null
let userRecord = { id: 'user-1', username: 'admin', role: 'admin', status: 'active' }

function mergePrismaData(current: Record<string, unknown> | null, data: Record<string, unknown>): Record<string, unknown> {
  return { ...current, ...Object.fromEntries(Object.entries(data).filter((entry) => entry[1] !== undefined)) }
}

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    worker: {
      findMany: vi.fn(async () => (workerRecord && workerRecord.status !== 'deleted' ? [workerRecord] : [])),
      count: vi.fn(async () => (workerRecord && workerRecord.status !== 'deleted' ? 1 : 0)),
      findFirst: vi.fn(async (args) => {
        if (!workerRecord) return null
        const where = args.where
        if (where.id && where.id !== workerRecord.id) return null
        if (where.status?.not === workerRecord.status) return null
        if (where.hkidHash && where.hkidHash === workerRecord.hkidHash && where.subcontractorId === workerRecord.subcontractorId && where.status === workerRecord.status) {
          return { id: workerRecord.id }
        }
        return workerRecord
      }),
      create: vi.fn(async (args) => {
        workerRecord = { id: 'worker-1', createdAt: new Date('2026-05-01T00:00:00.000Z'), updatedAt: new Date('2026-05-01T00:00:00.000Z'), ...args.data }
        return workerRecord
      }),
      update: vi.fn(async (args) => {
        workerRecord = { ...workerRecord, ...args.data, updatedAt: new Date('2026-05-02T00:00:00.000Z') }
        return workerRecord
      })
    },
    auditLog: {
      create: vi.fn(async (args) => {
        auditRows.push(args.data)
        return { id: `audit-${auditRows.length}`, ...args.data }
      })
    },
    user: {
      findUnique: vi.fn(async () => userRecord)
    },
    $transaction: vi.fn(async (callback) =>
      callback({
        worker: {
          findFirst: async (args: { where: Record<string, unknown>; select?: Record<string, boolean> }) => {
            if (!workerRecord) return null
            if (args.where.hkidHash === workerRecord.hkidHash && args.where.subcontractorId === workerRecord.subcontractorId && args.where.status === workerRecord.status) {
              return { id: workerRecord.id }
            }
            if (args.select?.id) return { id: workerRecord.id }
            return workerRecord
          },
          create: async (args: { data: Record<string, unknown> }) => {
            workerRecord = { id: 'worker-1', createdAt: new Date('2026-05-01T00:00:00.000Z'), updatedAt: new Date('2026-05-01T00:00:00.000Z'), ...args.data }
            return workerRecord
          },
          update: async (args: { data: Record<string, unknown> }) => {
            workerRecord = mergePrismaData(workerRecord, { updatedAt: new Date('2026-05-02T00:00:00.000Z'), ...args.data })
            return workerRecord
          }
        },
        auditLog: {
          create: async (args: { data: { action: string; entity: string; entityId: string | null; oldValue: string | null; newValue: string | null } }) => {
            auditRows.push(args.data)
            return { id: `audit-${auditRows.length}`, ...args.data }
          }
        }
      })
    )
  }
}))

const { app } = await import('../src/app.js')

function token(): string {
  return jwt.sign({ username: 'admin', role: 'admin' }, 'test-secret', { subject: 'user-1', expiresIn: '8h' })
}

function auth() {
  return { Authorization: `Bearer ${token()}` }
}

describe('Worker API trace', () => {
  beforeEach(() => {
    auditRows.length = 0
    workerRecord = null
    userRecord = { id: 'user-1', username: 'admin', role: 'admin', status: 'active' }
  })

  it('traces create, masked reads, reveal, bank update, delete, and audit rows', async () => {
    const createResponse = await request(app)
      .post('/api/workers')
      .set(auth())
      .send({
        nameZh: '陳大文',
        hkid: 'A123456(7)',
        subcontractorId: 'sub-1',
        joinDate: '2026-05-01',
        wageType: 'daily',
        wageAmount: 800,
        bankName: 'HSBC',
        bankAccount: '1234560001'
      })

    expect(createResponse.status).toBe(201)
    expect(createResponse.body.data.hkidMasked).toBe('A123***(7)')
    expect(createResponse.body.data.bankAccountMasked).toBe('****-0001')
    expect(createResponse.body.data).not.toHaveProperty('hkidHash')
    expect(createResponse.body.data).not.toHaveProperty('hkidEncrypted')
    expect(createResponse.body.data).not.toHaveProperty('bankAccountEnc')

    const listResponse = await request(app).get('/api/workers').set(auth())
    expect(listResponse.status).toBe(200)
    expect(listResponse.body.data[0].hkidMasked).toBe('A123***(7)')

    const getResponse = await request(app).get('/api/workers/worker-1').set(auth())
    expect(getResponse.status).toBe(200)
    expect(getResponse.body.data).not.toHaveProperty('hkidEncrypted')

    const revealHkidResponse = await request(app).get('/api/workers/worker-1/reveal-hkid').set(auth())
    expect(revealHkidResponse.status).toBe(200)
    expect(revealHkidResponse.body.data.hkid).toBe('A1234567')

    const revealBankResponse = await request(app).get('/api/workers/worker-1/reveal-bank').set(auth())
    expect(revealBankResponse.status).toBe(200)
    expect(revealBankResponse.body.data.bankAccount).toBe('1234560001')

    const updateBankResponse = await request(app).patch('/api/workers/worker-1').set(auth()).send({ bankAccount: '99990002' })
    expect(updateBankResponse.status).toBe(200)
    expect(updateBankResponse.body.data.bankAccountMasked).toBe('****-0002')

    const revealUpdatedBankResponse = await request(app).get('/api/workers/worker-1/reveal-bank').set(auth())
    expect(revealUpdatedBankResponse.status).toBe(200)
    expect(revealUpdatedBankResponse.body.data.bankAccount).toBe('99990002')

    const joinDateResponse = await request(app).patch('/api/workers/worker-1').set(auth()).send({ joinDate: '2026-05-15' })
    expect(joinDateResponse.body).toEqual(expect.objectContaining({ success: true }))
    expect(joinDateResponse.status).toBe(200)
    expect(joinDateResponse.body.data.mpf60DayReviewed).toBe(false)

    const deleteResponse = await request(app).delete('/api/workers/worker-1').set(auth())
    expect(deleteResponse.status).toBe(200)

    expect(auditRows.map((row) => row.action)).toEqual([
      'create',
      'reveal_hkid',
      'reveal_bank',
      'update',
      'reveal_bank',
      'update',
      'delete'
    ])
    const auditSqlEquivalent = auditRows.map((row) => ({ entity: row.entity, action: row.action, entityId: row.entityId }))
    expect(auditSqlEquivalent).toContainEqual({ entity: 'worker', action: 'create', entityId: 'worker-1' })
    expect(auditSqlEquivalent).toContainEqual({ entity: 'worker', action: 'update', entityId: 'worker-1' })
    expect(auditSqlEquivalent).toContainEqual({ entity: 'worker', action: 'delete', entityId: 'worker-1' })
    expect(auditSqlEquivalent).toContainEqual({ entity: 'worker', action: 'reveal_hkid', entityId: 'worker-1' })
    expect(auditSqlEquivalent).toContainEqual({ entity: 'worker', action: 'reveal_bank', entityId: 'worker-1' })
    expect(JSON.stringify(auditRows)).not.toContain('A1234567')
    expect(JSON.stringify(auditRows)).not.toContain('99990002')
  })

  it('requires auth on worker endpoints', async () => {
    const response = await request(app).get('/api/workers')
    expect(response.status).toBe(401)
  })
})
