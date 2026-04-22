import { Router } from 'express'
import { getAuditLogs } from '../controllers/audit.controller.js'
import { requireAdmin, requireAuth } from '../middlewares/auth.middleware.js'
import { authReadRateLimiter } from '../middlewares/rate-limit.middleware.js'

export const auditRouter = Router()

auditRouter.get('/', authReadRateLimiter, requireAuth, requireAdmin, getAuditLogs)
