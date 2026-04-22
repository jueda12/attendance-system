import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/providers/auth-provider'

export function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="p-6">載入中...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
