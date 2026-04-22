import type { NextFunction, Request, Response } from 'express'
import { AuditService } from '../services/audit.service.js'

const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const auditService = new AuditService()

function inferEntity(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments[1] ?? 'unknown'
}

function inferAction(method: string): string {
  if (method === 'POST') return 'create'
  if (method === 'PUT' || method === 'PATCH') return 'update'
  if (method === 'DELETE') return 'delete'
  return 'unknown'
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    if (!mutatingMethods.has(req.method) || res.statusCode >= 400 || req.path.startsWith('/api/audit')) {
      return
    }

    void auditService.create({
      userId: req.user?.id ?? null,
      username: req.user?.username ?? res.locals.username ?? null,
      action: res.locals.action ?? inferAction(req.method),
      entity: res.locals.entity ?? inferEntity(req.path),
      entityId: res.locals.entityId ?? null,
      oldValue: res.locals.oldValue ? JSON.stringify(res.locals.oldValue) : null,
      newValue: res.locals.newValue ? JSON.stringify(res.locals.newValue) : null,
      ipAddress: req.ip ?? '',
      userAgent: req.headers['user-agent'] ?? null
    })
  })

  next()
}
