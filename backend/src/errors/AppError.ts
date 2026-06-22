interface AppErrorOptions {
  cause?: unknown
  context?: Record<string, unknown>
  statusCode?: number
}

export class AppError extends Error {
  public readonly statusCode: number
  public readonly context: Record<string, unknown>

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message)
    this.name = 'AppError'
    this.statusCode = options.statusCode ?? 500
    this.context = options.context ?? {}

    if (options.cause instanceof Error) {
      this.cause = options.cause
    }
  }

  static notFound(message: string, context?: Record<string, unknown>): AppError {
    return new AppError(message, { statusCode: 404, context })
  }

  static badRequest(message: string, context?: Record<string, unknown>): AppError {
    return new AppError(message, { statusCode: 400, context })
  }

  static internal(message: string, cause?: unknown, context?: Record<string, unknown>): AppError {
    return new AppError(message, { statusCode: 500, cause, context })
  }
}