import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '@/lib/api'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const schema = z.object({
  username: z.string().min(1, '請輸入帳號'),
  password: z.string().min(1, '請輸入密碼')
})

type LoginForm = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [errorMessage, setErrorMessage] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginForm>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (values: LoginForm) => {
    setErrorMessage('')
    try {
      const response = await api.post<{ token: string }>('/auth/login', values)
      await login(response.data.token)
      navigate('/')
    } catch {
      setErrorMessage('登入失敗，請檢查帳號密碼')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-lg bg-white p-6 shadow">
        <h1 className="mb-6 text-2xl font-semibold">系統登入</h1>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Field>
            <FieldLabel htmlFor="username">帳號</FieldLabel>
            <Input id="username" {...register('username')} />
            <FieldError>{errors.username?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="password">密碼</FieldLabel>
            <Input id="password" type="password" {...register('password')} />
            <FieldError>{errors.password?.message}</FieldError>
          </Field>
          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
          <Button disabled={isSubmitting} type="submit" className="w-full">
            {isSubmitting ? '登入中...' : '登入'}
          </Button>
        </form>
      </section>
    </main>
  )
}
