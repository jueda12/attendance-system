import { Navigate, Route, Routes } from 'react-router'
import { DashboardPage } from '@/pages/dashboard-page'
import { ChangePasswordPage } from '@/pages/change-password-page'
import { LoginPage } from '@/pages/login-page'
import { ProtectedLayout } from '@/routes/protected-layout'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
