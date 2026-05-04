import type { Prisma, Worker } from '@prisma/client'
import { Prisma as PrismaNamespace } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../utils/app-error.js'
import { encryptBankAccount, revealBankAccount } from '../utils/bank-crypto.js'
import { encryptHkid, revealHkid } from '../utils/hkid-crypto.js'
import type { Actor, PaginationMeta, RequestMeta } from './master-data.service.js'

export type WorkerListFilter = {
  search?: string
  status?: 'active' | 'resigned'
  subcontractorId?: string
  page?: number
  limit?: number
}

export type CreateWorkerInput = {
  workerCode?: string
  nameZh: string
  nameEn?: string | null
  hkid: string
  phone?: string | null
  address?: string | null
  joinDate: Date
  leaveDate?: Date | null
  leaveReason?: string | null
  subcontractorId: string
  wageType: 'daily' | 'hourly' | 'monthly'
  wageAmount: number
  defaultDailyHours?: number
  otMultiplier?: number
  cwraNo?: string | null
  cwraExpiry?: Date | null
  greenCardNo?: string | null
  greenCardExpiry?: Date | null
  trades?: string | null
  bankName?: string | null
  bankAccount?: string | null
  status?: 'active' | 'resigned'
  remarks?: string | null
}

export type UpdateWorkerInput = Omit<Partial<CreateWorkerInput>, 'workerCode' | 'hkid' | 'subcontractorId'>

type WorkerResponse = Omit<Worker, 'hkidHash' | 'hkidEncrypted' | 'bankAccountEnc'>

type ListResult<T> = {
  items: T[]
  meta: PaginationMeta
}

const workerAuditFields = [
  'workerCode',
  'nameZh',
  'nameEn',
  'hkidMasked',
  'phone',
  'address',
  'subcontractorId',
  'joinDate',
  'leaveDate',
  'leaveReason',
  'wageType',
  'wageAmount',
  'defaultDailyHours',
  'otMultiplier',
  'cwraNo',
  'cwraExpiry',
  'greenCardNo',
  'greenCardExpiry',
  'trades',
  'mpfScheme',
  'mpf60DayReviewed',
  'mpf60DayReviewedAt',
  'mpf60DayDecision',
  'bankName',
  'bankAccountMasked',
  'status',
  'remarks'
] as const

type WorkerAuditField = (typeof workerAuditFields)[number]
type WorkerEditableAuditField = Exclude<WorkerAuditField, 'workerCode' | 'hkidMasked' | 'subcontractorId' | 'wageAmount' | 'defaultDailyHours' | 'otMultiplier' | 'mpfScheme' | 'mpf60DayReviewed' | 'mpf60DayReviewedAt' | 'mpf60DayDecision' | 'bankAccountMasked'>

const normalizePage = (page: number | undefined) => Math.max(1, page ?? 1)
const normalizeLimit = (limit: number | undefined) => Math.min(200, Math.max(1, limit ?? 50))
const optionalString = (value: string | null | undefined) => value ?? null
const decimalValue = (value: number | undefined) => (value === undefined ? undefined : new PrismaNamespace.Decimal(value))
const serializeValue = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString()
  if (PrismaNamespace.Decimal.isDecimal(value)) return value.toString()
  return value
}

function stripWorker(worker: Worker): WorkerResponse {
  const response = { ...worker } as Partial<Worker>
  delete response.hkidHash
  delete response.hkidEncrypted
  delete response.bankAccountEnc
  return response as WorkerResponse
}

function workerSnapshot(worker: Worker): Record<string, unknown> {
  return Object.fromEntries(workerAuditFields.map((field) => [field, serializeValue(worker[field])]))
}

function changedField(record: Worker, field: (typeof workerAuditFields)[number], nextValue: unknown): boolean {
  return serializeValue(record[field]) !== serializeValue(nextValue)
}

function diffWorker(record: Worker, input: UpdateWorkerInput, bankAccountMasked: string | null | undefined): { oldValue: Record<string, unknown>; newValue: Record<string, unknown> } {
  const oldValue: Record<string, unknown> = {}
  const newValue: Record<string, unknown> = {}

  const fields: WorkerEditableAuditField[] = [
    'nameZh',
    'nameEn',
    'phone',
    'address',
    'joinDate',
    'leaveDate',
    'leaveReason',
    'wageType',
    'cwraNo',
    'cwraExpiry',
    'greenCardNo',
    'greenCardExpiry',
    'trades',
    'bankName',
    'status',
    'remarks'
  ]

  for (const field of fields) {
    if (!(field in input)) continue
    const nextValue = input[field as keyof UpdateWorkerInput]
    if (changedField(record, field, nextValue)) {
      oldValue[field] = serializeValue(record[field])
      newValue[field] = serializeValue(nextValue ?? null)
    }
  }

  if ('wageAmount' in input && input.wageAmount !== undefined) {
    const nextValue = new PrismaNamespace.Decimal(input.wageAmount)
    if (changedField(record, 'wageAmount', nextValue)) {
      oldValue.wageAmount = serializeValue(record.wageAmount)
      newValue.wageAmount = serializeValue(nextValue)
    }
  }

  if ('defaultDailyHours' in input && input.defaultDailyHours !== undefined) {
    const nextValue = new PrismaNamespace.Decimal(input.defaultDailyHours)
    if (changedField(record, 'defaultDailyHours', nextValue)) {
      oldValue.defaultDailyHours = serializeValue(record.defaultDailyHours)
      newValue.defaultDailyHours = serializeValue(nextValue)
    }
  }

  if ('otMultiplier' in input && input.otMultiplier !== undefined) {
    const nextValue = new PrismaNamespace.Decimal(input.otMultiplier)
    if (changedField(record, 'otMultiplier', nextValue)) {
      oldValue.otMultiplier = serializeValue(record.otMultiplier)
      newValue.otMultiplier = serializeValue(nextValue)
    }
  }

  if ('bankAccount' in input && bankAccountMasked !== undefined && record.bankAccountMasked !== bankAccountMasked) {
    oldValue.bankAccountMasked = record.bankAccountMasked
    newValue.bankAccountMasked = bankAccountMasked
  }

  const joinDateChanged = 'joinDate' in input && input.joinDate !== undefined && record.joinDate.getTime() !== input.joinDate.getTime()
  if (joinDateChanged) {
    if (!('mpf60DayReviewed' in oldValue)) {
      oldValue.mpf60DayReviewed = record.mpf60DayReviewed
      newValue.mpf60DayReviewed = false
    }
    oldValue.mpf60DayReviewedAt = serializeValue(record.mpf60DayReviewedAt)
    newValue.mpf60DayReviewedAt = null
    oldValue.mpf60DayDecision = record.mpf60DayDecision
    newValue.mpf60DayDecision = null
  }

  return { oldValue, newValue }
}

function isP2002(error: unknown, field: string): boolean {
  return (
    error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes(field)
  )
}

function mapPrismaCreateError(error: unknown): never {
  if (isP2002(error, 'workerCode')) {
    throw new AppError('工號已存在', 409, { code: 'WORKER_CODE_DUPLICATE' })
  }
  throw error
}

function createAuditData(worker: Worker): Record<string, unknown> {
  return workerSnapshot(worker)
}

export class WorkerService {
  async list(filters: WorkerListFilter = {}): Promise<ListResult<WorkerResponse>> {
    const page = normalizePage(filters.page)
    const limit = normalizeLimit(filters.limit)
    const where: Prisma.WorkerWhereInput = {
      status: filters.status ?? { not: 'deleted' }
    }

    if (filters.subcontractorId) {
      where.subcontractorId = filters.subcontractorId
    }

    if (filters.search) {
      where.OR = [
        { workerCode: { contains: filters.search } },
        { nameZh: { contains: filters.search } },
        { nameEn: { contains: filters.search } },
        { hkidMasked: { contains: filters.search } },
        { phone: { contains: filters.search } },
        { cwraNo: { contains: filters.search } },
        { greenCardNo: { contains: filters.search } },
        { trades: { contains: filters.search } }
      ]
    }

    const [items, total] = await Promise.all([
      prisma.worker.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.worker.count({ where })
    ])

    return { items: items.map(stripWorker), meta: { page, limit, total } }
  }

  async get(id: string): Promise<WorkerResponse> {
    return stripWorker(await this.getRecord(id))
  }

  async create(input: CreateWorkerInput, actor: Actor, meta: RequestMeta): Promise<WorkerResponse> {
    if (input.workerCode) {
      try {
        return await this.createWithCode(input, input.workerCode, actor, meta)
      } catch (error) {
        mapPrismaCreateError(error)
      }
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const workerCode = await this.nextWorkerCode()
      try {
        return await this.createWithCode(input, workerCode, actor, meta)
      } catch (error) {
        if (isP2002(error, 'workerCode') && attempt < 3) continue
        mapPrismaCreateError(error)
      }
    }

    throw new AppError('未能產生工號', 409, { code: 'WORKER_CODE_GENERATION_FAILED' })
  }

  async update(id: string, input: UpdateWorkerInput, actor: Actor, meta: RequestMeta): Promise<WorkerResponse> {
    const current = await this.getRecord(id)
    const bank = 'bankAccount' in input && input.bankAccount ? encryptBankAccount(input.bankAccount) : undefined
    const { oldValue, newValue } = diffWorker(current, input, bank?.masked)
    const joinDateChanged = 'joinDate' in input && input.joinDate !== undefined && current.joinDate.getTime() !== input.joinDate.getTime()

    return prisma.$transaction(async (tx) => {
      const worker = await tx.worker.update({
        where: { id },
        data: {
          nameZh: input.nameZh,
          nameEn: 'nameEn' in input ? optionalString(input.nameEn) : undefined,
          phone: 'phone' in input ? optionalString(input.phone) : undefined,
          address: 'address' in input ? optionalString(input.address) : undefined,
          joinDate: input.joinDate,
          leaveDate: 'leaveDate' in input ? input.leaveDate : undefined,
          leaveReason: 'leaveReason' in input ? optionalString(input.leaveReason) : undefined,
          wageType: input.wageType,
          wageAmount: decimalValue(input.wageAmount),
          defaultDailyHours: decimalValue(input.defaultDailyHours),
          otMultiplier: decimalValue(input.otMultiplier),
          cwraNo: 'cwraNo' in input ? optionalString(input.cwraNo) : undefined,
          cwraExpiry: 'cwraExpiry' in input ? input.cwraExpiry : undefined,
          greenCardNo: 'greenCardNo' in input ? optionalString(input.greenCardNo) : undefined,
          greenCardExpiry: 'greenCardExpiry' in input ? input.greenCardExpiry : undefined,
          trades: 'trades' in input ? optionalString(input.trades) : undefined,
          bankName: 'bankName' in input ? optionalString(input.bankName) : undefined,
          bankAccountEnc: bank?.encrypted,
          bankAccountMasked: bank?.masked,
          status: input.status,
          remarks: 'remarks' in input ? optionalString(input.remarks) : undefined,
          ...(joinDateChanged
            ? {
                mpf60DayReviewed: false,
                mpf60DayReviewedAt: null,
                mpf60DayDecision: null
              }
            : {})
        }
      })

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          username: actor.username,
          action: 'update',
          entity: 'worker',
          entityId: id,
          oldValue: JSON.stringify(oldValue),
          newValue: JSON.stringify(newValue),
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent
        }
      })

      return stripWorker(worker)
    })
  }

  async delete(id: string, actor: Actor, meta: RequestMeta): Promise<void> {
    const current = await this.getRecord(id)

    await prisma.$transaction(async (tx) => {
      await tx.worker.update({ where: { id }, data: { status: 'deleted' } })
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          username: actor.username,
          action: 'delete',
          entity: 'worker',
          entityId: id,
          oldValue: JSON.stringify(workerSnapshot(current)),
          newValue: JSON.stringify({ status: 'deleted' }),
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent
        }
      })
    })
  }

  async revealHkid(id: string, actor: Actor, meta: RequestMeta): Promise<{ hkid: string }> {
    const worker = await this.getRecord(id)
    const hkid = revealHkid(worker.hkidEncrypted)

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        username: actor.username,
        action: 'reveal_hkid',
        entity: 'worker',
        entityId: id,
        oldValue: null,
        newValue: JSON.stringify({ field: 'hkid', reason: 'explicit_reveal', hkidMasked: worker.hkidMasked }),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }
    })

    return { hkid }
  }

  async revealBank(id: string, actor: Actor, meta: RequestMeta): Promise<{ bankAccount: string }> {
    const worker = await this.getRecord(id)
    if (!worker.bankAccountEnc) {
      throw new AppError('銀行戶口不存在', 404, { code: 'WORKER_BANK_ACCOUNT_NOT_FOUND' })
    }

    const bankAccount = revealBankAccount(worker.bankAccountEnc)
    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        username: actor.username,
        action: 'reveal_bank',
        entity: 'worker',
        entityId: id,
        oldValue: null,
        newValue: JSON.stringify({ field: 'bankAccount', reason: 'explicit_reveal', bankAccountMasked: worker.bankAccountMasked }),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }
    })

    return { bankAccount }
  }

  private async getRecord(id: string): Promise<Worker> {
    const worker = await prisma.worker.findFirst({ where: { id, status: { not: 'deleted' } } })
    if (!worker) {
      throw new AppError('工人不存在', 404)
    }
    return worker
  }

  private async nextWorkerCode(): Promise<string> {
    const workers = await prisma.worker.findMany({
      where: { workerCode: { startsWith: 'W' } },
      select: { workerCode: true },
      orderBy: { workerCode: 'desc' },
      take: 200
    })
    const max = workers.reduce((current, worker) => {
      const match = /^W(\d{4})$/.exec(worker.workerCode)
      return match ? Math.max(current, Number(match[1])) : current
    }, 0)

    return `W${String(max + 1).padStart(4, '0')}`
  }

  private async createWithCode(input: CreateWorkerInput, workerCode: string, actor: Actor, meta: RequestMeta): Promise<WorkerResponse> {
    const hkid = encryptHkid(input.hkid)
    const bank = input.bankAccount ? encryptBankAccount(input.bankAccount) : null

    return prisma.$transaction(async (tx) => {
      const duplicate = await tx.worker.findFirst({
        where: { subcontractorId: input.subcontractorId, hkidHash: hkid.hash, status: 'active' },
        select: { id: true }
      })
      if (duplicate) {
        throw new AppError('同一分判商已有相同 HKID 的在職工人', 409, {
          code: 'WORKER_HKID_DUPLICATE',
          details: { subcontractorId: input.subcontractorId }
        })
      }

      const worker = await tx.worker.create({
        data: {
          workerCode,
          nameZh: input.nameZh,
          nameEn: optionalString(input.nameEn),
          hkidMasked: hkid.masked,
          hkidHash: hkid.hash,
          hkidEncrypted: hkid.encrypted,
          phone: optionalString(input.phone),
          address: optionalString(input.address),
          joinDate: input.joinDate,
          leaveDate: input.leaveDate ?? null,
          leaveReason: optionalString(input.leaveReason),
          subcontractorId: input.subcontractorId,
          wageType: input.wageType,
          wageAmount: new PrismaNamespace.Decimal(input.wageAmount),
          defaultDailyHours: new PrismaNamespace.Decimal(input.defaultDailyHours ?? 8),
          otMultiplier: new PrismaNamespace.Decimal(input.otMultiplier ?? 1),
          cwraNo: optionalString(input.cwraNo),
          cwraExpiry: input.cwraExpiry ?? null,
          greenCardNo: optionalString(input.greenCardNo),
          greenCardExpiry: input.greenCardExpiry ?? null,
          trades: optionalString(input.trades),
          mpfScheme: 'industry',
          bankName: optionalString(input.bankName),
          bankAccountEnc: bank?.encrypted ?? null,
          bankAccountMasked: bank?.masked ?? null,
          status: input.status ?? 'active',
          remarks: optionalString(input.remarks)
        }
      })

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          username: actor.username,
          action: 'create',
          entity: 'worker',
          entityId: worker.id,
          oldValue: null,
          newValue: JSON.stringify(createAuditData(worker)),
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent
        }
      })

      return stripWorker(worker)
    })
  }
}
