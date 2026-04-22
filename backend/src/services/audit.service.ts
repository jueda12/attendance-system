import type { AuditLog } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export type AuditInput = Omit<AuditLog, 'id' | 'timestamp'> & { timestamp?: Date }

export class AuditService {
  async create(input: AuditInput): Promise<void> {
    await prisma.auditLog.create({
      data: {
        ...input,
        timestamp: input.timestamp ?? new Date()
      }
    })
  }

  async list(filters: { from?: Date; to?: Date; userId?: string; entity?: string }): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: {
        userId: filters.userId,
        entity: filters.entity,
        timestamp: {
          gte: filters.from,
          lte: filters.to
        }
      },
      orderBy: { timestamp: 'desc' }
    })
  }
}
