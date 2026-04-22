import type { NextFunction, Request, Response } from 'express'
import { AuditService } from '../services/audit.service.js'

const auditService = new AuditService()

export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const logs = await auditService.list({
      from: req.query.from ? new Date(String(req.query.from)) : undefined,
      to: req.query.to ? new Date(String(req.query.to)) : undefined,
      userId: req.query.userId ? String(req.query.userId) : undefined,
      entity: req.query.entity ? String(req.query.entity) : undefined
    })

    res.json(logs)
  } catch (error) {
    next(error)
  }
}
