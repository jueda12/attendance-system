import { Router } from 'express'
import {
  createWorker,
  deleteWorker,
  getWorker,
  listWorkers,
  revealWorkerBank,
  revealWorkerHkid,
  updateWorker
} from '../controllers/worker.controller.js'
import { createWorkerSchema, updateWorkerSchema, workerListQuerySchema } from '../controllers/worker.schemas.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { authReadRateLimiter } from '../middlewares/rate-limit.middleware.js'
import { validateBody, validateQuery } from '../middlewares/validation.middleware.js'

export const workerRouter = Router()

workerRouter.use(requireAuth)
workerRouter.get('/', authReadRateLimiter, validateQuery(workerListQuerySchema, { format: 'v2' }), listWorkers)
workerRouter.get('/:id', authReadRateLimiter, getWorker)
workerRouter.get('/:id/reveal-hkid', authReadRateLimiter, revealWorkerHkid)
workerRouter.get('/:id/reveal-bank', authReadRateLimiter, revealWorkerBank)
workerRouter.post('/', validateBody(createWorkerSchema, { format: 'v2' }), createWorker)
workerRouter.patch('/:id', validateBody(updateWorkerSchema, { format: 'v2' }), updateWorker)
workerRouter.delete('/:id', deleteWorker)
