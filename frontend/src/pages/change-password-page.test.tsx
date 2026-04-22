import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ChangePasswordPage } from './change-password-page'
import { AuthProvider } from '@/providers/auth-provider'

describe('ChangePasswordPage', () => {
  it('renders forced password change form', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ChangePasswordPage />
        </AuthProvider>
      </MemoryRouter>
    )

    expect(screen.getByText('首次登入請修改密碼')).toBeInTheDocument()
    expect(screen.getByLabelText('目前密碼')).toBeInTheDocument()
    expect(screen.getByLabelText('新密碼')).toBeInTheDocument()
  })
})
