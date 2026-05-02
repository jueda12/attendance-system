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
import { createSite, getSite, updateSite, type SiteFormValues } from '@/lib/master-data-api'

const createSchema = z.object({
  code: z.string().trim().min(1, '請輸入地盤代碼'),
  nameZh: z.string().trim().min(1, '請輸入地盤名稱'),
  address: z.string().optional(),
  startDate: z.string().min(1, '請選擇開始日期'),
  endDate: z.string().optional(),
  pmName: z.string().optional(),
  status: z.enum(['active', 'closed']),
  remarks: z.string().optional()
})

const editSchema = createSchema.omit({ code: true })
type CreateFormValues = z.infer<typeof createSchema>
type EditFormValues = z.infer<typeof editSchema>
type FormValues = CreateFormValues | EditFormValues

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : ''
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message ?? error.response?.data?.message ?? '儲存地盤失敗'
  }
  return '儲存地盤失敗'
}

export function SiteFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const isEdit = Boolean(id)
  const [serverError, setServerError] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['site', id],
    queryFn: () => getSite(id!),
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
  const createMutation = useMutation({ mutationFn: createSite })
  const updateMutation = useMutation({ mutationFn: (values: EditFormValues) => updateSite(id!, values) })

  useEffect(() => {
    if (data) {
      reset({
        nameZh: data.nameZh,
        address: data.address ?? '',
        startDate: toDateInput(data.startDate),
        endDate: toDateInput(data.endDate),
        pmName: data.pmName ?? '',
        status: data.status === 'deleted' ? 'closed' : data.status,
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
        await createMutation.mutateAsync(values as SiteFormValues)
      }
      toast.show(isEdit ? '已更新地盤' : '已新增地盤')
      navigate('/sites')
    } catch (error) {
      setServerError(errorMessage(error))
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <section className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold text-slate-900">{isEdit ? '編輯地盤' : '新增地盤'}</h1>
        <p className="mt-1 text-sm text-slate-600">請輸入地盤基本資料。</p>
        {isLoading ? <p className="mt-6 text-slate-600">載入中...</p> : null}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {!isEdit ? (
            <Field>
              <FieldLabel htmlFor="code">地盤代碼</FieldLabel>
              <Input id="code" {...register('code')} />
              <FieldError>{'code' in errors ? errors.code?.message : undefined}</FieldError>
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="nameZh">地盤名稱</FieldLabel>
            <Input id="nameZh" {...register('nameZh')} />
            <FieldError>{errors.nameZh?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="address">地址</FieldLabel>
            <Input id="address" {...register('address')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="startDate">開始日期</FieldLabel>
            <Input id="startDate" type="date" {...register('startDate')} />
            <FieldError>{errors.startDate?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="endDate">結束日期</FieldLabel>
            <Input id="endDate" type="date" {...register('endDate')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="pmName">項目經理</FieldLabel>
            <Input id="pmName" {...register('pmName')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="status">狀態</FieldLabel>
            <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" id="status" {...register('status')}>
              <option value="active">啟用</option>
              <option value="closed">已關閉</option>
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="remarks">備註</FieldLabel>
            <Input id="remarks" {...register('remarks')} />
          </Field>
          {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/sites')}>
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
