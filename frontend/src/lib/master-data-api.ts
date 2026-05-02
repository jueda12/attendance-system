import { api } from '@/lib/api'

export type PaginationMeta = {
  page: number
  limit: number
  total: number
}

export type ListResponse<T> = {
  success: true
  data: T[]
  meta: PaginationMeta
}

export type DetailResponse<T> = {
  success: true
  data: T
}

export type Subcontractor = {
  id: string
  code: string
  nameZh: string
  nameEn: string | null
  brNo: string | null
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  status: 'active' | 'inactive' | 'deleted'
  remarks: string | null
  createdAt: string
  updatedAt: string
}

export type SubcontractorFormValues = {
  code: string
  nameZh: string
  nameEn?: string
  brNo?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  status?: 'active' | 'inactive'
  remarks?: string
}

export type Site = {
  id: string
  code: string
  nameZh: string
  address: string | null
  startDate: string
  endDate: string | null
  pmName: string | null
  status: 'active' | 'closed' | 'deleted'
  remarks: string | null
  createdAt: string
  updatedAt: string
}

export type SiteFormValues = {
  code: string
  nameZh: string
  address?: string
  startDate: string
  endDate?: string
  pmName?: string
  status?: 'active' | 'closed'
  remarks?: string
}

export async function listSubcontractors(): Promise<ListResponse<Subcontractor>> {
  const response = await api.get<ListResponse<Subcontractor>>('/subcontractors')
  return response.data
}

export async function getSubcontractor(id: string): Promise<Subcontractor> {
  const response = await api.get<DetailResponse<Subcontractor>>(`/subcontractors/${id}`)
  return response.data.data
}

export async function createSubcontractor(values: SubcontractorFormValues): Promise<Subcontractor> {
  const response = await api.post<DetailResponse<Subcontractor>>('/subcontractors', values)
  return response.data.data
}

export async function updateSubcontractor(id: string, values: Omit<SubcontractorFormValues, 'code'>): Promise<Subcontractor> {
  const response = await api.patch<DetailResponse<Subcontractor>>(`/subcontractors/${id}`, values)
  return response.data.data
}

export async function deleteSubcontractor(id: string): Promise<void> {
  await api.delete(`/subcontractors/${id}`)
}

export async function listSites(): Promise<ListResponse<Site>> {
  const response = await api.get<ListResponse<Site>>('/sites')
  return response.data
}

export async function getSite(id: string): Promise<Site> {
  const response = await api.get<DetailResponse<Site>>(`/sites/${id}`)
  return response.data.data
}

export async function createSite(values: SiteFormValues): Promise<Site> {
  const response = await api.post<DetailResponse<Site>>('/sites', values)
  return response.data.data
}

export async function updateSite(id: string, values: Omit<SiteFormValues, 'code'>): Promise<Site> {
  const response = await api.patch<DetailResponse<Site>>(`/sites/${id}`, values)
  return response.data.data
}

export async function deleteSite(id: string): Promise<void> {
  await api.delete(`/sites/${id}`)
}
