import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App'
import { AuthProvider } from './providers/auth-provider'

describe('app routes', () => {
  it('shows login page by default', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    )

    expect(screen.getByText('系統登入')).toBeInTheDocument()
  })
})
