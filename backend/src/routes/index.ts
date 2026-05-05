import { Router } from 'express'
import { healthRouter } from './health.routes.js'
import { authRouter } from './auth.routes.js'
import { auditRouter } from './audit.routes.js'
import { subcontractorRouter } from './subcontractor.routes.js'
import { siteRouter } from './site.routes.js'
import { workerRouter } from './worker.routes.js'

export const apiRouter = Router()

apiRouter.use('/', healthRouter)
apiRouter.use('/auth', authRouter)
apiRouter.use('/audit', auditRouter)
apiRouter.use('/subcontractors', subcontractorRouter)
apiRouter.use('/sites', siteRouter)
apiRouter.use('/workers', workerRouter)
