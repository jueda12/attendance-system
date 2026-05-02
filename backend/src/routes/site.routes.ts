import { Router } from 'express'
import { createSite, deleteSite, getSite, listSites, updateSite } from '../controllers/site.controller.js'
import { createSiteSchema, updateSiteSchema } from '../controllers/master-data.schemas.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { authReadRateLimiter } from '../middlewares/rate-limit.middleware.js'
import { validateBody } from '../middlewares/validation.middleware.js'

export const siteRouter = Router()

siteRouter.use(requireAuth)
siteRouter.get('/', authReadRateLimiter, listSites)
siteRouter.get('/:id', authReadRateLimiter, getSite)
siteRouter.post('/', validateBody(createSiteSchema, { format: 'v2' }), createSite)
siteRouter.patch('/:id', validateBody(updateSiteSchema, { format: 'v2' }), updateSite)
siteRouter.delete('/:id', deleteSite)
