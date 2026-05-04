import type { NextFunction, Request, Response } from 'express'
import { WorkerService } from '../services/worker.service.js'

const workerService = new WorkerService()

function requestMeta(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null
  }
}

function routeId(req: Request): string {
  return String(req.params.id)
}

export async function listWorkers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await workerService.list(req.query)
    res.json({ success: true, data: result.items, meta: result.meta })
  } catch (error) {
    next(error)
  }
}

export async function getWorker(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const worker = await workerService.get(routeId(req))
    res.json({ success: true, data: worker })
  } catch (error) {
    next(error)
  }
}

export async function createWorker(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const worker = await workerService.create(req.body, req.user!, requestMeta(req))
    res.status(201).json({ success: true, data: worker })
  } catch (error) {
    next(error)
  }
}

export async function updateWorker(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const worker = await workerService.update(routeId(req), req.body, req.user!, requestMeta(req))
    res.json({ success: true, data: worker })
  } catch (error) {
    next(error)
  }
}

export async function deleteWorker(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await workerService.delete(routeId(req), req.user!, requestMeta(req))
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

export async function revealWorkerHkid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await workerService.revealHkid(routeId(req), req.user!, requestMeta(req))
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function revealWorkerBank(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await workerService.revealBank(routeId(req), req.user!, requestMeta(req))
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}
