import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import {
  createSubcontractor,
  getSubcontractor,
  updateSubcontractor,
  type SubcontractorFormValues
} from '@/lib/master-data-api'

const createSchema = z.object({
  code: z.string().trim().min(1, '請輸入分判商代碼'),
  nameZh: z.string().trim().min(1, '請輸入分判商名稱'),
  nameEn: z.string().optional(),
  brNo: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('電郵格式不正確').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']),
  remarks: z.string().optional()
})

const editSchema = createSchema.omit({ code: true })
type CreateFormValues = z.infer<typeof createSchema>
type EditFormValues = z.infer<typeof editSchema>
type FormValues = CreateFormValues | EditFormValues

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message ?? error.response?.data?.message ?? '儲存分判商失敗'
  }
  return '儲存分判商失敗'
}

export function SubcontractorFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const isEdit = Boolean(id)
  const [serverError, setServerError] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['subcontractor', id],
    queryFn: () => getSubcontractor(id!),
    enabled: isEdit
  })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: { status: 'active' }
  })
  const createMutation = useMutation({ mutationFn: createSubcontractor })
  const updateMutation = useMutation({ mutationFn: (values: EditFormValues) => updateSubcontractor(id!, values) })

  useEffect(() => {
    if (data) {
      reset({
        nameZh: data.nameZh,
        nameEn: data.nameEn ?? '',
        brNo: data.brNo ?? '',
        contactName: data.contactName ?? '',
        contactPhone: data.contactPhone ?? '',
        contactEmail: data.contactEmail ?? '',
        status: data.status === 'deleted' ? 'inactive' : data.status,
        remarks: data.remarks ?? ''
      })
    }
  }, [data, reset])

  const onSubmit = async (values: FormValues) => {
    setServerError('')
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(values as EditFormValues)
      } else {
        await createMutation.mutateAsync(values as SubcontractorFormValues)
      }
      toast.show(isEdit ? '已更新分判商' : '已新增分判商')
      navigate('/subcontractors')
    } catch (error) {
      setServerError(errorMessage(error))
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <section className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold text-slate-900">{isEdit ? '編輯分判商' : '新增分判商'}</h1>
        <p className="mt-1 text-sm text-slate-600">請輸入分判商基本資料。</p>
        {isLoading ? <p className="mt-6 text-slate-600">載入中...</p> : null}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {!isEdit ? (
            <Field>
              <FieldLabel htmlFor="code">分判商代碼</FieldLabel>
              <Input id="code" {...register('code')} />
              <FieldError>{'code' in errors ? errors.code?.message : undefined}</FieldError>
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="nameZh">分判商名稱</FieldLabel>
            <Input id="nameZh" {...register('nameZh')} />
            <FieldError>{errors.nameZh?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="nameEn">英文名稱</FieldLabel>
            <Input id="nameEn" {...register('nameEn')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="brNo">商業登記號碼</FieldLabel>
            <Input id="brNo" {...register('brNo')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="contactName">聯絡人</FieldLabel>
            <Input id="contactName" {...register('contactName')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="contactPhone">聯絡電話</FieldLabel>
            <Input id="contactPhone" {...register('contactPhone')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="contactEmail">聯絡電郵</FieldLabel>
            <Input id="contactEmail" {...register('contactEmail')} />
            <FieldError>{errors.contactEmail?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="status">狀態</FieldLabel>
            <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" id="status" {...register('status')}>
              <option value="active">啟用</option>
              <option value="inactive">停用</option>
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="remarks">備註</FieldLabel>
            <Input id="remarks" {...register('remarks')} />
          </Field>
          {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/subcontractors')}>
              取消
            </Button>
            <Button disabled={isSubmitting || createMutation.isPending || updateMutation.isPending} type="submit">
              {isSubmitting ? '儲存中...' : '儲存'}
            </Button>
          </div>
        </form>
      </section>
    </main>
  )
}
