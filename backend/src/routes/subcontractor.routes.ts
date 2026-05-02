import { Router } from 'express'
import {
  createSubcontractor,
  deleteSubcontractor,
  getSubcontractor,
  listSubcontractors,
  updateSubcontractor
} from '../controllers/subcontractor.controller.js'
import { createSubcontractorSchema, updateSubcontractorSchema } from '../controllers/master-data.schemas.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { authReadRateLimiter } from '../middlewares/rate-limit.middleware.js'
import { validateBody } from '../middlewares/validation.middleware.js'

export const subcontractorRouter = Router()

subcontractorRouter.use(requireAuth)
subcontractorRouter.get('/', authReadRateLimiter, listSubcontractors)
subcontractorRouter.get('/:id', authReadRateLimiter, getSubcontractor)
subcontractorRouter.post('/', validateBody(createSubcontractorSchema, { format: 'v2' }), createSubcontractor)
subcontractorRouter.patch('/:id', validateBody(updateSubcontractorSchema, { format: 'v2' }), updateSubcontractor)
subcontractorRouter.delete('/:id', deleteSubcontractor)
