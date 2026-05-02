import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'
import { AppError } from '../utils/app-error.js'

type ValidateOptions = {
  format?: 'legacy' | 'v2'
}

export const validateBody =
  <T>(schema: ZodSchema<T>, options: ValidateOptions = {}) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      if (options.format === 'v2') {
        next(new AppError('驗證錯誤', 400, { code: 'VALIDATION_ERROR', details: result.error.issues }))
        return
      }

      next(new AppError(result.error.issues[0]?.message ?? '驗證錯誤', 400))
      return
    }

    req.body = result.data
    next()
  }
