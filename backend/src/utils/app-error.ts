export type AppErrorMetadata = {
  code?: string
  details?: unknown
}

export class AppError extends Error {
  statusCode: number
  metadata?: AppErrorMetadata

  constructor(message: string, statusCode = 400, metadata?: AppErrorMetadata) {
    super(message)
    this.statusCode = statusCode
    this.metadata = metadata
  }
}
