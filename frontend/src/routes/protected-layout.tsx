import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/providers/auth-provider'

export function ProtectedLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="p-6">載入中...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.mustChangePwd && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return <Outlet />
}
