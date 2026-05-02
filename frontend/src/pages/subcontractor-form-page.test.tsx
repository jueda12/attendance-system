import { cleanup, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render-with-providers'
import { SubcontractorFormPage } from './subcontractor-form-page'
import {
  createSubcontractor,
  getSubcontractor,
  updateSubcontractor,
  type Subcontractor
} from '@/lib/master-data-api'

const { navigateMock, toastShowMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  toastShowMock: vi.fn()
}))

let paramsMock: Record<string, string | undefined>

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => paramsMock
  }
})

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ show: toastShowMock })
}))

vi.mock('@/lib/master-data-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/master-data-api')>('@/lib/master-data-api')
  return {
    ...actual,
    createSubcontractor: vi.fn(),
    getSubcontractor: vi.fn(),
    updateSubcontractor: vi.fn()
  }
})

const subcontractor: Subcontractor = {
  id: 'sub-1',
  code: 'SUB-A',
  nameZh: '分判商 A',
  nameEn: 'Sub A',
  brNo: '12345678',
  contactName: '陳生',
  contactPhone: '91234567',
  contactEmail: 'sub@example.com',
  status: 'active',
  remarks: '備註',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z'
}

describe('SubcontractorFormPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    paramsMock = {}
    navigateMock.mockReset()
    toastShowMock.mockReset()
    vi.mocked(createSubcontractor).mockReset()
    vi.mocked(getSubcontractor).mockReset()
    vi.mocked(updateSubcontractor).mockReset()
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(false)
  })

  it('renders create mode fields', () => {
    renderWithProviders(<SubcontractorFormPage />, { route: '/subcontractors/new' })

    expect(screen.getByRole('heading', { name: '新增分判商' })).toBeInTheDocument()
    expect(screen.getByLabelText('分判商代碼')).toBeInTheDocument()
    expect(screen.getByLabelText('分判商名稱')).toBeInTheDocument()
  })

  it('blocks create submit when required fields are empty', async () => {
    const { user } = renderWithProviders(<SubcontractorFormPage />, { route: '/subcontractors/new' })

    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByText('請輸入分判商代碼')).toBeInTheDocument()
    expect(screen.getByText('請輸入分判商名稱')).toBeInTheDocument()
    expect(createSubcontractor).not.toHaveBeenCalled()
  })

  it('creates subcontractor and navigates back to list', async () => {
    vi.mocked(createSubcontractor).mockResolvedValue(subcontractor)
    const { user } = renderWithProviders(<SubcontractorFormPage />, { route: '/subcontractors/new' })

    await user.type(screen.getByLabelText('分判商代碼'), 'SUB-A')
    await user.type(screen.getByLabelText('分判商名稱'), '分判商 A')
    await user.click(screen.getByRole('button', { name: '儲存' }))

    await waitFor(() => {
      expect(createSubcontractor).toHaveBeenCalled()
    })
    expect(vi.mocked(createSubcontractor).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ code: 'SUB-A', nameZh: '分判商 A', status: 'active' })
    )
    expect(toastShowMock).toHaveBeenCalledWith(expect.stringMatching(/已新增|已更新|成功/))
    expect(navigateMock).toHaveBeenCalledWith('/subcontractors')
  })

  it('loads edit mode data and hides immutable code field', async () => {
    paramsMock = { id: 'sub-1' }
    vi.mocked(getSubcontractor).mockResolvedValue(subcontractor)

    renderWithProviders(<SubcontractorFormPage />, { route: '/subcontractors/sub-1' })

    expect(await screen.findByDisplayValue('分判商 A')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Sub A')).toBeInTheDocument()
    expect(screen.getByDisplayValue('12345678')).toBeInTheDocument()
    expect(screen.queryByLabelText('分判商代碼')).not.toBeInTheDocument()
  })

  it('updates subcontractor without sending code', async () => {
    paramsMock = { id: 'sub-1' }
    vi.mocked(getSubcontractor).mockResolvedValue(subcontractor)
    vi.mocked(updateSubcontractor).mockResolvedValue({ ...subcontractor, nameZh: '分判商 B', status: 'inactive' })
    const { user } = renderWithProviders(<SubcontractorFormPage />, { route: '/subcontractors/sub-1' })

    const nameInput = await screen.findByLabelText('分判商名稱')
    await waitFor(() => {
      expect(nameInput).toHaveValue('分判商 A')
    })
    await user.clear(nameInput)
    await user.type(nameInput, '分判商 B')
    await user.selectOptions(screen.getByLabelText('狀態'), 'inactive')
    await user.click(screen.getByRole('button', { name: '儲存' }))

    await waitFor(() => {
      expect(updateSubcontractor).toHaveBeenCalled()
    })
    expect(vi.mocked(updateSubcontractor).mock.calls[0]?.[0]).toBe('sub-1')
    expect(vi.mocked(updateSubcontractor).mock.calls[0]?.[1]).not.toEqual(expect.objectContaining({ code: expect.anything() }))
    expect(vi.mocked(updateSubcontractor).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ nameZh: '分判商 B', status: 'inactive' })
    )
    expect(toastShowMock).toHaveBeenCalledWith(expect.stringMatching(/已新增|已更新|成功/))
    expect(navigateMock).toHaveBeenCalledWith('/subcontractors')
  })

  it('shows backend validation error message', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    vi.mocked(createSubcontractor).mockRejectedValue({ response: { data: { error: { message: '驗證錯誤' } } } })
    const { user } = renderWithProviders(<SubcontractorFormPage />, { route: '/subcontractors/new' })

    await user.type(screen.getByLabelText('分判商代碼'), 'SUB-A')
    await user.type(screen.getByLabelText('分判商名稱'), '分判商 A')
    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByText('驗證錯誤')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
