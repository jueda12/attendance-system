import type { NextFunction, Request, Response } from 'express'
import { listQuerySchema } from './master-data.schemas.js'
import { SiteService } from '../services/master-data.service.js'

const siteService = new SiteService()

function requestMeta(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null
  }
}

function routeId(req: Request): string {
  return String(req.params.id)
}

export async function listSites(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = listQuerySchema.parse(req.query)
    const result = await siteService.list({
      ...filters,
      status: filters.status === 'active' || filters.status === 'closed' ? filters.status : undefined
    })
    res.json({ success: true, data: result.items, meta: result.meta })
  } catch (error) {
    next(error)
  }
}

export async function getSite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const site = await siteService.get(routeId(req))
    res.json({ success: true, data: site })
  } catch (error) {
    next(error)
  }
}

export async function createSite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const site = await siteService.create(req.body, req.user!, requestMeta(req))
    res.status(201).json({ success: true, data: site })
  } catch (error) {
    next(error)
  }
}

export async function updateSite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const site = await siteService.update(routeId(req), req.body, req.user!, requestMeta(req))
    res.json({ success: true, data: site })
  } catch (error) {
    next(error)
  }
}

export async function deleteSite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await siteService.delete(routeId(req), req.user!, requestMeta(req))
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}
