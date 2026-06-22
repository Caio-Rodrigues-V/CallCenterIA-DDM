type LogLevel = 'info' | 'warn' | 'error' | 'success'

export const logService = {
  info: (category: string, message: string, details?: unknown) =>
    log('info', category, message, details),

  warn: (category: string, message: string, details?: unknown) =>
    log('warn', category, message, details),

  error: (category: string, message: string, details?: unknown) =>
    log('error', category, message, details),

  success: (category: string, message: string, details?: unknown) =>
    log('success', category, message, details),
}

function log(level: LogLevel, category: string, message: string, details?: unknown): void {
  const prefix = `[${category}]`

  switch (level) {
    case 'error':
      console.error(prefix, message, details ?? '')
      break
    case 'warn':
      console.warn(prefix, message, details ?? '')
      break
    default:
      console.log(prefix, message, details ?? '')
  }
}