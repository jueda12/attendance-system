import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render-with-providers'
import { SubcontractorsListPage } from './subcontractors-list-page'
import {
  deleteSubcontractor,
  listSubcontractors,
  type ListResponse,
  type Subcontractor
} from '@/lib/master-data-api'

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
    listSubcontractors: vi.fn(),
    deleteSubcontractor: vi.fn()
  }
})

const subcontractor: Subcontractor = {
  id: 'sub-1',
  code: 'SUB-A',
  nameZh: '分判商 A',
  nameEn: null,
  brNo: '12345678',
  contactName: '陳生',
  contactPhone: '91234567',
  contactEmail: null,
  status: 'active',
  remarks: null,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z'
}

function listResponse(data: Subcontractor[]): ListResponse<Subcontractor> {
  return { success: true, data, meta: { page: 1, limit: 50, total: data.length } }
}

describe('SubcontractorsListPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    navigateMock.mockReset()
    toastShowMock.mockReset()
    vi.mocked(listSubcontractors).mockReset()
    vi.mocked(deleteSubcontractor).mockReset()
  })

  it('shows loading state while subcontractors are loading', () => {
    vi.mocked(listSubcontractors).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<SubcontractorsListPage />)

    expect(screen.getByText('載入中...')).toBeInTheDocument()
  })

  it('shows empty state when there are no subcontractors', async () => {
    vi.mocked(listSubcontractors).mockResolvedValue(listResponse([]))

    renderWithProviders(<SubcontractorsListPage />)

    expect(await screen.findByText('尚未有分判商紀錄，請點「新增分判商」。')).toBeInTheDocument()
  })

  it('renders subcontractor table rows', async () => {
    vi.mocked(listSubcontractors).mockResolvedValue(listResponse([subcontractor]))

    renderWithProviders(<SubcontractorsListPage />)

    const row = await screen.findByRole('row', { name: /SUB-A/ })
    expect(within(row).getByText('分判商 A')).toBeInTheDocument()
    expect(within(row).getByText('12345678')).toBeInTheDocument()
    expect(within(row).getByText('陳生')).toBeInTheDocument()
    expect(within(row).getByText('91234567')).toBeInTheDocument()
    expect(within(row).getByText('啟用')).toBeInTheDocument()
  })

  it('navigates to create page when clicking add button', async () => {
    vi.mocked(listSubcontractors).mockResolvedValue(listResponse([]))
    const { user } = renderWithProviders(<SubcontractorsListPage />)

    await user.click(screen.getByRole('button', { name: '新增分判商' }))

    expect(navigateMock).toHaveBeenCalledWith('/subcontractors/new')
  })

  it('navigates to edit page when clicking edit link', async () => {
    vi.mocked(listSubcontractors).mockResolvedValue(listResponse([subcontractor]))
    renderWithProviders(<SubcontractorsListPage />)

    const editLink = await screen.findByRole('link', { name: '編輯' })

    expect(editLink).toHaveAttribute('href', '/subcontractors/sub-1')
  })

  it('deletes after confirmation and invalidates the list query', async () => {
    vi.mocked(listSubcontractors).mockResolvedValue(listResponse([subcontractor]))
    vi.mocked(deleteSubcontractor).mockResolvedValue(undefined)
    const { user, queryClient } = renderWithProviders(<SubcontractorsListPage />)
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const row = await screen.findByRole('row', { name: /SUB-A/ })
    await user.click(within(row).getByRole('button', { name: '刪除' }))
    expect(screen.getByText('確認刪除分判商')).toBeInTheDocument()
    expect(screen.getAllByText(/分判商 A/).length).toBeGreaterThan(1)

    await user.click(screen.getByRole('button', { name: '確認刪除' }))

    await waitFor(() => {
      expect(deleteSubcontractor).toHaveBeenCalled()
    })
    expect(vi.mocked(deleteSubcontractor).mock.calls[0]?.[0]).toBe('sub-1')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['subcontractors'] })
    expect(toastShowMock).toHaveBeenCalledWith(expect.stringMatching(/刪除/))
  })
})
