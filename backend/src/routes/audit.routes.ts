import { Router } from 'express'
import { getAuditLogs } from '../controllers/audit.controller.js'
import { requireAdmin, requireAuth } from '../middlewares/auth.middleware.js'

export const auditRouter = Router()

auditRouter.get('/', requireAuth, requireAdmin, getAuditLogs)
