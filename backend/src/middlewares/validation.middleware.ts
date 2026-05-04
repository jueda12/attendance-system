import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'
import { AppError } from '../utils/app-error.js'

type ValidateOptions = {
  format?: 'legacy' | 'v2'
}

function validationError(error: { issues: unknown[] }, options: ValidateOptions): AppError {
  if (options.format === 'v2') {
    return new AppError('驗證錯誤', 400, { code: 'VALIDATION_ERROR', details: error.issues })
  }

  const firstIssue = error.issues[0] as { message?: string } | undefined
  return new AppError(firstIssue?.message ?? '驗證錯誤', 400)
}

export const validateBody =
  <T>(schema: ZodSchema<T>, options: ValidateOptions = {}) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      next(validationError(result.error, options))
      return
    }

    req.body = result.data
    next()
  }

export const validateQuery =
  <T>(schema: ZodSchema<T>, options: ValidateOptions = {}) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)

    if (!result.success) {
      next(validationError(result.error, options))
      return
    }

    req.query = result.data as Request['query']
    next()
  }
