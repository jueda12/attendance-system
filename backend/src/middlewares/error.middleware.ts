import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/app-error.js'

export function errorMiddleware(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  void next
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message })
    return
  }

  res.status(500).json({ message: 'Internal server error' })
}
