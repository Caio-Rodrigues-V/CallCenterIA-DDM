import { supabaseAdmin } from '../lib/supabase.js'
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
  created_at: string
}

export class LogRepository {
  async insert(input: LogInput): Promise<void> {
    const { error } = await supabaseAdmin
      .from('system_logs')
      .insert({
        level: input.level,
        category: input.category,
        message: input.message,
        details: input.details ?? null,
      })

    if (error) {
      console.error('[LogRepository] erro ao inserir log:', error.message)
    }
  }

  async findRecent(limit = 100): Promise<LogRow[]> {
    const { data, error } = await supabaseAdmin
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw AppError.internal('Erro ao buscar logs', error)
    }

    return (data ?? []) as LogRow[]
  }

  async deleteAll(): Promise<void> {
    const { error } = await supabaseAdmin
      .from('system_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      throw AppError.internal('Erro ao limpar logs', error)
    }
  }
}