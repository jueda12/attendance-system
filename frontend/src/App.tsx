import { Navigate, Route, Routes } from 'react-router'
import { DashboardPage } from '@/pages/dashboard-page'
import { ChangePasswordPage } from '@/pages/change-password-page'
import { LoginPage } from '@/pages/login-page'
import { SiteFormPage } from '@/pages/site-form-page'
import { SitesListPage } from '@/pages/sites-list-page'
import { SubcontractorFormPage } from '@/pages/subcontractor-form-page'
import { SubcontractorsListPage } from '@/pages/subcontractors-list-page'
import { ProtectedLayout } from '@/routes/protected-layout'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/" element={<DashboardPage />} />
        <Route path="/subcontractors" element={<SubcontractorsListPage />} />
        <Route path="/subcontractors/new" element={<SubcontractorFormPage />} />
        <Route path="/subcontractors/:id" element={<SubcontractorFormPage />} />
        <Route path="/sites" element={<SitesListPage />} />
        <Route path="/sites/new" element={<SiteFormPage />} />
        <Route path="/sites/:id" element={<SiteFormPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
