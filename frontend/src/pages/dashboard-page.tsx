import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'

export function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">儀表板（開發中）</h1>
      <p className="mt-2 text-slate-600">歡迎，{user?.nameZh ?? user?.username}</p>
      <Button
        className="mt-4"
        variant="outline"
        onClick={() => {
          logout()
        }}
      >
        登出
      </Button>
    </main>
  )
}
