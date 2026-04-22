import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChangePasswordPage } from './change-password-page'

const { postMock, refreshUserMock, navigateMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  refreshUserMock: vi.fn(),
  navigateMock: vi.fn()
}))

vi.mock('@/lib/api', () => ({
  api: {
    post: postMock
  }
}))

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    refreshUser: refreshUserMock
  })
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ...actual,
    useNavigate: () => navigateMock
  }
})

describe('ChangePasswordPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    postMock.mockReset()
    refreshUserMock.mockReset()
    navigateMock.mockReset()
  })

  it('renders forced password change form', () => {
    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>
    )

    expect(screen.getByText('首次登入請修改密碼')).toBeInTheDocument()
    expect(screen.getByLabelText('目前密碼')).toBeInTheDocument()
    expect(screen.getByLabelText('新密碼')).toBeInTheDocument()
  })

  it('shows validation error when confirm password does not match', async () => {
    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('目前密碼'), { target: { value: 'TempPass123!' } })
    fireEvent.change(screen.getByLabelText('新密碼'), { target: { value: 'NewPass123!@#' } })
    fireEvent.change(screen.getByLabelText('確認新密碼'), { target: { value: 'Mismatch123!@#' } })
    fireEvent.click(screen.getByRole('button', { name: '更新密碼' }))

    await waitFor(() => {
      expect(screen.getByText('兩次輸入的新密碼不一致')).toBeInTheDocument()
    })
    expect(postMock).not.toHaveBeenCalled()
  })

  it('submits successfully and navigates to dashboard', async () => {
    postMock.mockResolvedValue({ data: { success: true } })
    refreshUserMock.mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('目前密碼'), { target: { value: 'TempPass123!' } })
    fireEvent.change(screen.getByLabelText('新密碼'), { target: { value: 'NewPass123!@#' } })
    fireEvent.change(screen.getByLabelText('確認新密碼'), { target: { value: 'NewPass123!@#' } })
    fireEvent.click(screen.getByRole('button', { name: '更新密碼' }))

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'TempPass123!',
        newPassword: 'NewPass123!@#'
      })
    })
    expect(refreshUserMock).toHaveBeenCalled()
    expect(navigateMock).toHaveBeenCalledWith('/')
  })

  it('shows specific error when new password matches current password', async () => {
    postMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'NEW_PASSWORD_SAME_AS_OLD'
        }
      }
    })

    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('目前密碼'), { target: { value: 'TempPass123!' } })
    fireEvent.change(screen.getByLabelText('新密碼'), { target: { value: 'TempPass123!' } })
    fireEvent.change(screen.getByLabelText('確認新密碼'), { target: { value: 'TempPass123!' } })
    fireEvent.click(screen.getByRole('button', { name: '更新密碼' }))

    await waitFor(() => {
      expect(screen.getByText('新密碼不能與目前密碼相同')).toBeInTheDocument()
    })
  })
})
