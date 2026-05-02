import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render-with-providers'
import { SitesListPage } from './sites-list-page'
import { deleteSite, listSites, type ListResponse, type Site } from '@/lib/master-data-api'

const { navigateMock, toastShowMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  toastShowMock: vi.fn()
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ...actual,
    useNavigate: () => navigateMock
  }
})

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ show: toastShowMock })
}))

vi.mock('@/lib/master-data-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/master-data-api')>('@/lib/master-data-api')
  return {
    ...actual,
    listSites: vi.fn(),
    deleteSite: vi.fn()
  }
})

const site: Site = {
  id: 'site-1',
  code: 'SITE-001',
  nameZh: '中環地盤',
  address: '中環',
  startDate: '2026-05-01T00:00:00.000Z',
  endDate: '2026-06-01T00:00:00.000Z',
  pmName: '李經理',
  status: 'closed',
  remarks: null,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z'
}

function listResponse(data: Site[]): ListResponse<Site> {
  return { success: true, data, meta: { page: 1, limit: 50, total: data.length } }
}

describe('SitesListPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    navigateMock.mockReset()
    toastShowMock.mockReset()
    vi.mocked(listSites).mockReset()
    vi.mocked(deleteSite).mockReset()
  })

  it('shows loading state while sites are loading', () => {
    vi.mocked(listSites).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<SitesListPage />)

    expect(screen.getByText('載入中...')).toBeInTheDocument()
  })

  it('shows empty state when there are no sites', async () => {
    vi.mocked(listSites).mockResolvedValue(listResponse([]))

    renderWithProviders(<SitesListPage />)

    expect(await screen.findByText('尚未有地盤紀錄，請點「新增地盤」。')).toBeInTheDocument()
  })

  it('renders site table rows', async () => {
    vi.mocked(listSites).mockResolvedValue(listResponse([site]))

    renderWithProviders(<SitesListPage />)

    const row = await screen.findByRole('row', { name: /SITE-001/ })
    expect(within(row).getByText('中環地盤')).toBeInTheDocument()
    expect(within(row).getByText('中環')).toBeInTheDocument()
    expect(within(row).getByText('2026-05-01')).toBeInTheDocument()
    expect(within(row).getByText('2026-06-01')).toBeInTheDocument()
    expect(within(row).getByText('李經理')).toBeInTheDocument()
    expect(within(row).getByText('已關閉')).toBeInTheDocument()
  })

  it('navigates to create page when clicking add button', async () => {
    vi.mocked(listSites).mockResolvedValue(listResponse([]))
    const { user } = renderWithProviders(<SitesListPage />)

    await user.click(screen.getByRole('button', { name: '新增地盤' }))

    expect(navigateMock).toHaveBeenCalledWith('/sites/new')
  })

  it('navigates to edit page when clicking edit link', async () => {
    vi.mocked(listSites).mockResolvedValue(listResponse([site]))
    renderWithProviders(<SitesListPage />)

    const editLink = await screen.findByRole('link', { name: '編輯' })

    expect(editLink).toHaveAttribute('href', '/sites/site-1')
  })

  it('deletes after confirmation and invalidates the list query', async () => {
    vi.mocked(listSites).mockResolvedValue(listResponse([site]))
    vi.mocked(deleteSite).mockResolvedValue(undefined)
    const { user, queryClient } = renderWithProviders(<SitesListPage />)
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const row = await screen.findByRole('row', { name: /SITE-001/ })
    await user.click(within(row).getByRole('button', { name: '刪除' }))
    expect(screen.getByText('確認刪除地盤')).toBeInTheDocument()
    expect(screen.getAllByText(/中環地盤/).length).toBeGreaterThan(1)

    await user.click(screen.getByRole('button', { name: '確認刪除' }))

    await waitFor(() => {
      expect(deleteSite).toHaveBeenCalled()
    })
    expect(vi.mocked(deleteSite).mock.calls[0]?.[0]).toBe('site-1')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sites'] })
    expect(toastShowMock).toHaveBeenCalledWith(expect.stringMatching(/刪除/))
  })
})
