import { Router } from 'express'
import { login, loginSchema, logout, me } from '../controllers/auth.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { validateBody } from '../middlewares/validation.middleware.js'

export const authRouter = Router()

authRouter.post('/login', validateBody(loginSchema), login)
authRouter.post('/logout', requireAuth, logout)
authRouter.get('/me', requireAuth, me)
