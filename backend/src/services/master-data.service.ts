import type { Prisma, Site, Subcontractor } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../utils/app-error.js'

export type Actor = {
  id: string
  username: string
  role: string
}

export type RequestMeta = {
  ipAddress: string | null
  userAgent: string | null
}

export type PaginationMeta = {
  page: number
  limit: number
  total: number
}

type ListResult<T> = {
  items: T[]
  meta: PaginationMeta
}

export type SubcontractorListFilter = {
  search?: string
  status?: 'active' | 'inactive'
  page?: number
  limit?: number
}

export type CreateSubcontractorInput = {
  code: string
  nameZh: string
  nameEn?: string
  brNo?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  status?: 'active' | 'inactive'
  remarks?: string
}

export type UpdateSubcontractorInput = Omit<Partial<CreateSubcontractorInput>, 'code'>

const subcontractorAuditFields = [
  'code',
  'nameZh',
  'nameEn',
  'brNo',
  'contactName',
  'contactPhone',
  'contactEmail',
  'status',
  'remarks'
] as const

const normalizeOptionalString = (value: string | undefined) => value ?? null

function subcontractorSnapshot(record: Subcontractor): Record<string, unknown> {
  return Object.fromEntries(subcontractorAuditFields.map((field) => [field, record[field]]))
}

function diffSubcontractor(
  record: Subcontractor,
  input: UpdateSubcontractorInput
): { oldValue: Record<string, unknown>; newValue: Record<string, unknown> } {
  const oldValue: Record<string, unknown> = {}
  const newValue: Record<string, unknown> = {}

  for (const field of subcontractorAuditFields) {
    if (field === 'code' || !(field in input)) continue
    const nextValue = normalizeOptionalString(input[field])
    if (record[field] !== nextValue) {
      oldValue[field] = record[field]
      newValue[field] = nextValue
    }
  }

  return { oldValue, newValue }
}

function normalizePage(page: number | undefined): number {
  return Math.max(1, page ?? 1)
}

function normalizeLimit(limit: number | undefined): number {
  return Math.min(200, Math.max(1, limit ?? 50))
}

export class SubcontractorService {
  async list(filters: SubcontractorListFilter = {}): Promise<ListResult<Subcontractor>> {
    const page = normalizePage(filters.page)
    const limit = normalizeLimit(filters.limit)
    const where: Prisma.SubcontractorWhereInput = {
      status: filters.status ?? { not: 'deleted' }
    }

    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search } },
        { nameZh: { contains: filters.search } },
        { nameEn: { contains: filters.search } },
        { brNo: { contains: filters.search } }
      ]
    }

    const [items, total] = await Promise.all([
      prisma.subcontractor.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.subcontractor.count({ where })
    ])

    return { items, meta: { page, limit, total } }
  }

  async get(id: string): Promise<Subcontractor> {
    const subcontractor = await prisma.subcontractor.findFirst({ where: { id, status: { not: 'deleted' } } })

    if (!subcontractor) {
      throw new AppError('分判商不存在', 404)
    }

    return subcontractor
  }

  async create(input: CreateSubcontractorInput, actor: Actor, meta: RequestMeta): Promise<Subcontractor> {
    return prisma.$transaction(async (tx) => {
      const subcontractor = await tx.subcontractor.create({
        data: {
          ...input,
          status: input.status ?? 'active'
        }
      })

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          username: actor.username,
          action: 'create',
          entity: 'subcontractor',
          entityId: subcontractor.id,
          oldValue: null,
          newValue: JSON.stringify(subcontractorSnapshot(subcontractor)),
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent
        }
      })

      return subcontractor
    })
  }

  async update(
    id: string,
    input: UpdateSubcontractorInput,
    actor: Actor,
    meta: RequestMeta
  ): Promise<Subcontractor> {
    const current = await this.get(id)
    const { oldValue, newValue } = diffSubcontractor(current, input)

    return prisma.$transaction(async (tx) => {
      const subcontractor = await tx.subcontractor.update({
        where: { id },
        data: input
      })

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          username: actor.username,
          action: 'update',
          entity: 'subcontractor',
          entityId: id,
          oldValue: JSON.stringify(oldValue),
          newValue: JSON.stringify(newValue),
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent
        }
      })

      return subcontractor
    })
  }

  async delete(id: string, actor: Actor, meta: RequestMeta): Promise<void> {
    const current = await this.get(id)

    await prisma.$transaction(async (tx) => {
      await tx.subcontractor.update({
        where: { id },
        data: { status: 'deleted' }
      })

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          username: actor.username,
          action: 'delete',
          entity: 'subcontractor',
          entityId: id,
          oldValue: JSON.stringify(subcontractorSnapshot(current)),
          newValue: JSON.stringify({ status: 'deleted' }),
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent
        }
      })
    })
  }
}

export type SiteListFilter = {
  search?: string
  status?: 'active' | 'closed'
  page?: number
  limit?: number
}

export type CreateSiteInput = {
  code: string
  nameZh: string
  address?: string
  startDate: Date
  endDate?: Date
  pmName?: string
  status?: 'active' | 'closed'
  remarks?: string
}

export type UpdateSiteInput = Omit<Partial<CreateSiteInput>, 'code'>

const siteAuditFields = ['code', 'nameZh', 'address', 'startDate', 'endDate', 'pmName', 'status', 'remarks'] as const

function serializeDateValue(value: unknown): unknown {
  return value instanceof Date ? value.toISOString() : value
}

function siteSnapshot(record: Site): Record<string, unknown> {
  return Object.fromEntries(siteAuditFields.map((field) => [field, serializeDateValue(record[field])]))
}

function diffSite(record: Site, input: UpdateSiteInput): { oldValue: Record<string, unknown>; newValue: Record<string, unknown> } {
  const oldValue: Record<string, unknown> = {}
  const newValue: Record<string, unknown> = {}

  for (const field of siteAuditFields) {
    if (field === 'code' || !(field in input)) continue
    const nextValue = serializeDateValue(input[field]) ?? null
    const currentValue = serializeDateValue(record[field])
    if (currentValue !== nextValue) {
      oldValue[field] = currentValue
      newValue[field] = nextValue
    }
  }

  return { oldValue, newValue }
}

export class SiteService {
  async list(filters: SiteListFilter = {}): Promise<ListResult<Site>> {
    const page = normalizePage(filters.page)
    const limit = normalizeLimit(filters.limit)
    const where: Prisma.SiteWhereInput = {
      status: filters.status ?? { not: 'deleted' }
    }

    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search } },
        { nameZh: { contains: filters.search } },
        { address: { contains: filters.search } },
        { pmName: { contains: filters.search } }
      ]
    }

    const [items, total] = await Promise.all([
      prisma.site.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.site.count({ where })
    ])

    return { items, meta: { page, limit, total } }
  }

  async get(id: string): Promise<Site> {
    const site = await prisma.site.findFirst({ where: { id, status: { not: 'deleted' } } })

    if (!site) {
      throw new AppError('地盤不存在', 404)
    }

    return site
  }

  async create(input: CreateSiteInput, actor: Actor, meta: RequestMeta): Promise<Site> {
    return prisma.$transaction(async (tx) => {
      const site = await tx.site.create({
        data: {
          ...input,
          status: input.status ?? 'active'
        }
      })

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          username: actor.username,
          action: 'create',
          entity: 'site',
          entityId: site.id,
          oldValue: null,
          newValue: JSON.stringify(siteSnapshot(site)),
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent
        }
      })

      return site
    })
  }

  async update(id: string, input: UpdateSiteInput, actor: Actor, meta: RequestMeta): Promise<Site> {
    const current = await this.get(id)
    const { oldValue, newValue } = diffSite(current, input)

    return prisma.$transaction(async (tx) => {
      const site = await tx.site.update({
        where: { id },
        data: input
      })

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          username: actor.username,
          action: 'update',
          entity: 'site',
          entityId: id,
          oldValue: JSON.stringify(oldValue),
          newValue: JSON.stringify(newValue),
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent
        }
      })

      return site
    })
  }

  async delete(id: string, actor: Actor, meta: RequestMeta): Promise<void> {
    const current = await this.get(id)

    await prisma.$transaction(async (tx) => {
      await tx.site.update({
        where: { id },
        data: { status: 'deleted' }
      })

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          username: actor.username,
          action: 'delete',
          entity: 'site',
          entityId: id,
          oldValue: JSON.stringify(siteSnapshot(current)),
          newValue: JSON.stringify({ status: 'deleted' }),
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent
        }
      })
    })
  }
}
