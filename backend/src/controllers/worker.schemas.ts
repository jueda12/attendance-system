import { z } from 'zod'

const optionalText = z.string().trim().nullable().optional()
const nonEmptyText = z.string().trim().min(1, '必填')
const workerCode = z.string().trim().regex(/^[A-Za-z0-9-]{2,10}$/, '工號只可包含 2-10 個英文字母、數字或連字號').optional()
const wageType = z.enum(['daily', 'hourly', 'monthly'])
const status = z.enum(['active', 'resigned'])

export const workerListQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['active', 'resigned']).optional(),
  subcontractorId: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional()
}).strict()

export const createWorkerSchema = z.object({
  workerCode,
  nameZh: nonEmptyText,
  nameEn: optionalText,
  hkid: nonEmptyText,
  phone: optionalText,
  address: optionalText,
  joinDate: z.coerce.date(),
  leaveDate: z.coerce.date().nullable().optional(),
  leaveReason: optionalText,
  subcontractorId: nonEmptyText,
  wageType,
  wageAmount: z.coerce.number().positive(),
  defaultDailyHours: z.coerce.number().positive().optional(),
  otMultiplier: z.coerce.number().positive().optional(),
  cwraNo: optionalText,
  cwraExpiry: z.coerce.date().nullable().optional(),
  greenCardNo: optionalText,
  greenCardExpiry: z.coerce.date().nullable().optional(),
  trades: optionalText,
  bankName: optionalText,
  bankAccount: optionalText,
  status: status.optional(),
  remarks: optionalText
}).strict()

export const updateWorkerSchema = createWorkerSchema
  .omit({ workerCode: true, hkid: true, subcontractorId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: '請至少提供一個更新欄位' })

export type WorkerListQuery = z.infer<typeof workerListQuerySchema>
export type CreateWorkerBody = z.infer<typeof createWorkerSchema>
export type UpdateWorkerBody = z.infer<typeof updateWorkerSchema>
