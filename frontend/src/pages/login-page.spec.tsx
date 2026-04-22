import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './login-page'
import { api } from '@/lib/api'

const navigateMock = vi.fn()
const loginMock = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => navigateMock
  }
})

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    login: loginMock
  })
}))

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn()
  }
}))

describe('login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('redirects to change-password when mustChangePwd is true', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        token: 'jwt-token',
        mustChangePwd: true
      }
    })
    loginMock.mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('帳號'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText('密碼'), { target: { value: 'TempPass123!' } })
    fireEvent.click(screen.getByRole('button', { name: '登入' }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('jwt-token')
      expect(navigateMock).toHaveBeenCalledWith('/change-password')
    })
  })

  it('redirects to dashboard when mustChangePwd is false', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        token: 'jwt-token',
        mustChangePwd: false
      }
    })
    loginMock.mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('帳號'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText('密碼'), { target: { value: 'NewPass123!abcd' } })
    fireEvent.click(screen.getByRole('button', { name: '登入' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/')
    })
  })
})
