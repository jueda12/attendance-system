import { z } from 'zod'

const optionalText = z.string().trim().optional()
const nonEmptyText = z.string().trim().min(1, '必填')

export const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional()
})

export const createSubcontractorSchema = z.object({
  code: nonEmptyText,
  nameZh: nonEmptyText,
  nameEn: optionalText,
  brNo: optionalText,
  contactName: optionalText,
  contactPhone: optionalText,
  contactEmail: z.email('電郵格式不正確').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional(),
  remarks: optionalText
})

export const updateSubcontractorSchema = createSubcontractorSchema
  .omit({ code: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: '請至少提供一個更新欄位' })

export const createSiteSchema = z.object({
  code: nonEmptyText,
  nameZh: nonEmptyText,
  address: optionalText,
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  pmName: optionalText,
  status: z.enum(['active', 'closed']).optional(),
  remarks: optionalText
})

export const updateSiteSchema = createSiteSchema
  .omit({ code: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: '請至少提供一個更新欄位' })
