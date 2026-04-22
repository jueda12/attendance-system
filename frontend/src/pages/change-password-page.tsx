import { useState } from 'react'
import { isAxiosError } from 'axios'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const schema = z
  .object({
    currentPassword: z.string().min(1, '請輸入目前密碼'),
    newPassword: z
      .string()
      .min(12, '新密碼最少需要 12 個字元')
      .regex(/[A-Z]/, '新密碼必須包含大寫字母')
      .regex(/[a-z]/, '新密碼必須包含小寫字母')
      .regex(/[0-9]/, '新密碼必須包含數字')
      .regex(/[^A-Za-z0-9]/, '新密碼必須包含特殊符號'),
    confirmPassword: z.string().min(1, '請確認新密碼')
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: '確認密碼與新密碼不一致',
    path: ['confirmPassword']
  })

type ChangePasswordForm = z.infer<typeof schema>

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (values: ChangePasswordForm) => {
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await api.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      })
      setSuccessMessage('密碼已更新，將返回主頁')
      reset()
      setTimeout(() => {
        navigate('/')
      }, 800)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message === 'NEW_PASSWORD_SAME_AS_OLD') {
        setErrorMessage('新密碼不可與目前密碼相同')
        return
      }
      if (isAxiosError(error) && error.response?.data?.message === 'CURRENT_PASSWORD_INCORRECT') {
        setErrorMessage('目前密碼不正確')
        return
      }
      setErrorMessage('更新密碼失敗，請稍後再試')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-lg bg-white p-6 shadow">
        <h1 className="mb-6 text-2xl font-semibold">請先更新密碼</h1>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Field>
            <FieldLabel htmlFor="currentPassword">目前密碼</FieldLabel>
            <Input id="currentPassword" type="password" {...register('currentPassword')} />
            <FieldError>{errors.currentPassword?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="newPassword">新密碼</FieldLabel>
            <Input id="newPassword" type="password" {...register('newPassword')} />
            <FieldError>{errors.newPassword?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="confirmPassword">確認新密碼</FieldLabel>
            <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
            <FieldError>{errors.confirmPassword?.message}</FieldError>
          </Field>
          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
          {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}
          <Button disabled={isSubmitting} type="submit" className="w-full">
            {isSubmitting ? '更新中...' : '更新密碼'}
          </Button>
        </form>
      </section>
    </main>
  )
}
