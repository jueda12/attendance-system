import { cleanup, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render-with-providers'
import { SiteFormPage } from './site-form-page'
import { createSite, getSite, updateSite, type Site } from '@/lib/master-data-api'

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
    createSite: vi.fn(),
    getSite: vi.fn(),
    updateSite: vi.fn()
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
  status: 'active',
  remarks: '備註',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z'
}

describe('SiteFormPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    paramsMock = {}
    navigateMock.mockReset()
    toastShowMock.mockReset()
    vi.mocked(createSite).mockReset()
    vi.mocked(getSite).mockReset()
    vi.mocked(updateSite).mockReset()
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(false)
  })

  it('renders create mode fields', () => {
    renderWithProviders(<SiteFormPage />, { route: '/sites/new' })

    expect(screen.getByRole('heading', { name: '新增地盤' })).toBeInTheDocument()
    expect(screen.getByLabelText('地盤代碼')).toBeInTheDocument()
    expect(screen.getByLabelText('地盤名稱')).toBeInTheDocument()
    expect(screen.getByLabelText('開始日期')).toBeInTheDocument()
  })

  it('blocks create submit when required fields are empty', async () => {
    const { user } = renderWithProviders(<SiteFormPage />, { route: '/sites/new' })

    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByText('請輸入地盤代碼')).toBeInTheDocument()
    expect(screen.getByText('請輸入地盤名稱')).toBeInTheDocument()
    expect(screen.getByText('請選擇開始日期')).toBeInTheDocument()
    expect(createSite).not.toHaveBeenCalled()
  })

  it('creates site and navigates back to list', async () => {
    vi.mocked(createSite).mockResolvedValue(site)
    const { user } = renderWithProviders(<SiteFormPage />, { route: '/sites/new' })

    await user.type(screen.getByLabelText('地盤代碼'), 'SITE-001')
    await user.type(screen.getByLabelText('地盤名稱'), '中環地盤')
    await user.type(screen.getByLabelText('開始日期'), '2026-05-01')
    await user.click(screen.getByRole('button', { name: '儲存' }))

    await waitFor(() => {
      expect(createSite).toHaveBeenCalled()
    })
    expect(vi.mocked(createSite).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ code: 'SITE-001', nameZh: '中環地盤', startDate: '2026-05-01', status: 'active' })
    )
    expect(toastShowMock).toHaveBeenCalledWith(expect.stringMatching(/已新增|已更新|成功/))
    expect(navigateMock).toHaveBeenCalledWith('/sites')
  })

  it('loads edit mode data, formats dates, and hides immutable code field', async () => {
    paramsMock = { id: 'site-1' }
    vi.mocked(getSite).mockResolvedValue(site)

    renderWithProviders(<SiteFormPage />, { route: '/sites/site-1' })

    expect(await screen.findByDisplayValue('中環地盤')).toBeInTheDocument()
    expect(screen.getByDisplayValue('中環')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-05-01')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-06-01')).toBeInTheDocument()
    expect(screen.queryByLabelText('地盤代碼')).not.toBeInTheDocument()
  })

  it('updates site without sending code', async () => {
    paramsMock = { id: 'site-1' }
    vi.mocked(getSite).mockResolvedValue(site)
    vi.mocked(updateSite).mockResolvedValue({ ...site, endDate: '2026-07-01T00:00:00.000Z', status: 'closed' })
    const { user } = renderWithProviders(<SiteFormPage />, { route: '/sites/site-1' })

    const endDateInput = await screen.findByLabelText('結束日期')
    await waitFor(() => {
      expect(endDateInput).toHaveValue('2026-06-01')
    })
    await user.clear(endDateInput)
    await user.type(endDateInput, '2026-07-01')
    await user.selectOptions(screen.getByLabelText('狀態'), 'closed')
    await user.click(screen.getByRole('button', { name: '儲存' }))

    await waitFor(() => {
      expect(updateSite).toHaveBeenCalled()
    })
    expect(vi.mocked(updateSite).mock.calls[0]?.[0]).toBe('site-1')
    expect(vi.mocked(updateSite).mock.calls[0]?.[1]).not.toEqual(expect.objectContaining({ code: expect.anything() }))
    expect(vi.mocked(updateSite).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ endDate: '2026-07-01', status: 'closed' })
    )
    expect(toastShowMock).toHaveBeenCalledWith(expect.stringMatching(/已新增|已更新|成功/))
    expect(navigateMock).toHaveBeenCalledWith('/sites')
  })

  it('shows backend validation error message', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    vi.mocked(createSite).mockRejectedValue({ response: { data: { error: { message: '驗證錯誤' } } } })
    const { user } = renderWithProviders(<SiteFormPage />, { route: '/sites/new' })

    await user.type(screen.getByLabelText('地盤代碼'), 'SITE-001')
    await user.type(screen.getByLabelText('地盤名稱'), '中環地盤')
    await user.type(screen.getByLabelText('開始日期'), '2026-05-01')
    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByText('驗證錯誤')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
