import { LogRepository, LogLevel } from '../repositories/LogRepository.js'

export class Logger {
  private static repository = new LogRepository()

  static async info(category: string, message: string, details?: Record<string, unknown>): Promise<void> {
    console.log(`[${category}] ${message}`, details ?? '')
    await this.log('info', category, message, details)
  }

  static async warn(category: string, message: string, details?: Record<string, unknown>): Promise<void> {
    console.warn(`[${category}] ${message}`, details ?? '')
    await this.log('warn', category, message, details)
  }

  static async error(category: string, message: string, details?: Record<string, unknown>): Promise<void> {
    console.error(`[${category}] ${message}`, details ?? '')
    await this.log('error', category, message, details)
  }

  static async success(category: string, message: string, details?: Record<string, unknown>): Promise<void> {
    console.log(`[${category}] ${message}`, details ?? '')
    await this.log('success', category, message, details)
  }

  private static async log(
    level: LogLevel,
    category: string,
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.repository.insert({ level, category, message, details: details ?? null })
  }
}