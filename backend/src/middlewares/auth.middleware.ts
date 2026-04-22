import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'

type JwtPayload = {
  sub: string
  username: string
  role: string
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError('Unauthorized', 401))
    return
  }

  try {
    const payload = jwt.verify(authHeader.slice(7), env.jwtSecret) as JwtPayload
    req.user = { id: payload.sub, username: payload.username, role: payload.role }
    next()
  } catch {
    next(new AppError('Unauthorized', 401))
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    next(new AppError('Forbidden', 403))
    return
  }

  next()
}
