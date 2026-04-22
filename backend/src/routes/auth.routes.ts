import { Router } from 'express'
import { login, loginSchema, logout, me } from '../controllers/auth.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { authReadRateLimiter, loginRouteRateLimiter } from '../middlewares/rate-limit.middleware.js'
import { validateBody } from '../middlewares/validation.middleware.js'

export const authRouter = Router()

authRouter.post('/login', loginRouteRateLimiter, validateBody(loginSchema), login)
authRouter.post('/logout', authReadRateLimiter, requireAuth, logout)
authRouter.get('/me', authReadRateLimiter, requireAuth, me)
