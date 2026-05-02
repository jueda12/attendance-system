import type { NextFunction, Request, Response } from 'express'
import { listQuerySchema } from './master-data.schemas.js'
import { SubcontractorService } from '../services/master-data.service.js'

const subcontractorService = new SubcontractorService()

function requestMeta(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null
  }
}

function routeId(req: Request): string {
  return String(req.params.id)
}

export async function listSubcontractors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = listQuerySchema.parse(req.query)
    const result = await subcontractorService.list({
      ...filters,
      status: filters.status === 'active' || filters.status === 'inactive' ? filters.status : undefined
    })
    res.json({ success: true, data: result.items, meta: result.meta })
  } catch (error) {
    next(error)
  }
}

export async function getSubcontractor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subcontractor = await subcontractorService.get(routeId(req))
    res.json({ success: true, data: subcontractor })
  } catch (error) {
    next(error)
  }
}

export async function createSubcontractor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subcontractor = await subcontractorService.create(req.body, req.user!, requestMeta(req))
    res.status(201).json({ success: true, data: subcontractor })
  } catch (error) {
    next(error)
  }
}

export async function updateSubcontractor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subcontractor = await subcontractorService.update(routeId(req), req.body, req.user!, requestMeta(req))
    res.json({ success: true, data: subcontractor })
  } catch (error) {
    next(error)
  }
}

export async function deleteSubcontractor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await subcontractorService.delete(routeId(req), req.user!, requestMeta(req))
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}
