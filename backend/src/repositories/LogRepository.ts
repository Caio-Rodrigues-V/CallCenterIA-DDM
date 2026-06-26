// backend/src/repositories/LogRepository.ts
import { prisma } from '../lib/prisma.js'
import { Prisma } from '@prisma/client'
import { AppError } from '../errors/AppError.js'

export type LogLevel = 'info' | 'warn' | 'error' | 'success'

export interface LogInput {
  level: LogLevel
  category: string
  message: string
  details?: Record<string, unknown> | null
}

export interface LogRow {
  id: string
  level: LogLevel
  category: string
  message: string
  details: Record<string, unknown> | null
  created_at: Date
}

export class LogRepository {
  async insert(input: LogInput): Promise<void> {
    try {
      await prisma.systemLog.create({
        data: {
          level: input.level,
          category: input.category,
          message: input.message,
          details:
            input.details === undefined
              ? undefined
              : input.details === null
                ? Prisma.DbNull
                : input.details as any,
        },
      })
    } catch (error) {
      // Logs nunca devem derrubar o fluxo principal
      console.error('[LogRepository] erro ao inserir log:', error)
    }
  }

  async findRecent(limit = 100): Promise<LogRow[]> {
    try {
      const logs = await prisma.systemLog.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
      })
      return logs as unknown as LogRow[]
    } catch (error) {
      throw AppError.internal('Erro ao buscar logs', error)
    }
  }

  async deleteAll(): Promise<void> {
    try {
      await prisma.systemLog.deleteMany()
    } catch (error) {
      throw AppError.internal('Erro ao limpar logs', error)
    }
  }
}
