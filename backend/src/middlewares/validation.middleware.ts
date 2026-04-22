import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'
import { AppError } from '../utils/app-error.js'

export const validateBody = <T>(schema: ZodSchema<T>) => (req: Request, _res: Response, next: NextFunction): void => {
  const result = schema.safeParse(req.body)

  if (!result.success) {
    next(new AppError(result.error.issues[0]?.message ?? '驗證錯誤', 400))
    return
  }

  req.body = result.data
  next()
}
