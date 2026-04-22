import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { AuthService } from '../services/auth.service.js'
import { AppError } from '../utils/app-error.js'
import { isIpLocked, recordFailedLogin, resetFailedLogins } from '../services/login-rate-limit.service.js'
import { AuditService } from '../services/audit.service.js'

const authService = new AuthService()
const auditService = new AuditService()
// Password policy: minimum 12 chars, includes lowercase, uppercase, number, and special character.
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).+$/

export const loginSchema = z.object({
  username: z.string().min(1, '請輸入帳號'),
  password: z.string().min(1, '請輸入密碼')
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '請輸入目前密碼'),
  newPassword: z
    .string()
    .min(12, '新密碼至少 12 個字元')
    .regex(PASSWORD_COMPLEXITY_REGEX, '新密碼需包含大小寫英文字母、數字及特殊符號')
})

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ipAddress = req.ip ?? ''

    if (isIpLocked(ipAddress)) {
      throw new AppError('登入已被鎖定，請 15 分鐘後再試', 429)
    }

    const loginResult = await authService.login(req.body.username, req.body.password, ipAddress)
    resetFailedLogins(ipAddress)

    res.locals.username = req.body.username
    res.locals.entityId = req.body.username
    res.locals.newValue = { event: 'login_success' }

    res.locals.action = 'login'
    res.locals.entity = 'auth'

    res.json(loginResult)
  } catch (error) {
    const ipAddress = req.ip ?? ''
    recordFailedLogin(ipAddress)
    await auditService.create({
      userId: null,
      username: req.body.username,
      action: 'login_fail',
      entity: 'auth',
      entityId: req.body.username,
      oldValue: null,
      newValue: JSON.stringify({ success: false }),
      ipAddress,
      userAgent: req.headers['user-agent'] ?? null
    })
    next(error)
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword)
    res.locals.action = 'password_change'
    res.locals.entity = 'auth'
    res.locals.entityId = req.user!.id
    res.locals.newValue = { passwordChanged: true, mustChangePwd: false }
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  res.locals.action = 'logout'
  res.locals.entity = 'auth'
  res.locals.entityId = req.user?.id
  res.locals.newValue = { event: 'logout' }
  res.json({ success: true })
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.me(req.user!.id)
    res.json(user)
  } catch (error) {
    next(error)
  }
}
