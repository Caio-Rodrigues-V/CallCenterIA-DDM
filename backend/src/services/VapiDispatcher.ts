import { env } from '../config/env.js'
import { AppError } from '../errors/AppError.js'

export interface DispatchCallInput {
  callRecordId?: string | null
  contactId: string
  campaignContactId: string
  campaignId: string
  customerNumber: string
  customerName: string
  customerCpf: string
  assistantId: string
  phoneNumberId: string
  callbackUrl: string
}

export interface DispatchResult {
  success: boolean
  statusCode: number | null
  error?: string
}

export class VapiDispatcher {
  private readonly requestIntervalMs: number
  private lastRequestAt = 0

  constructor(requestIntervalMs = env.campaignRequestIntervalMs) {
    this.requestIntervalMs = requestIntervalMs
  }

  async dispatch(input: DispatchCallInput): Promise<DispatchResult> {
    await this.respectRateLimit()

    const payload = this.buildN8nPayload(input)

    return this.sendWithRetry(payload)
  }

  private buildN8nPayload(input: DispatchCallInput): Record<string, unknown> {
    return {
      contactId: input.contactId,
      callRecordId: input.callRecordId,
      campaignContactId: input.campaignContactId,
      campaignId: input.campaignId,
      customerNumber: input.customerNumber,
      customerName: input.customerName,
      cpf: input.customerCpf,
      customerCpf: input.customerCpf,
      assistantId: input.assistantId,
      phoneNumberId: input.phoneNumberId,
      phoneId: input.phoneNumberId,
      callbackUrl: input.callbackUrl,
      serverUrl: input.callbackUrl,
      metadata: {
        callRecordId: input.callRecordId,
        contactId: input.contactId,
        campaignContactId: input.campaignContactId,
        campaignId: input.campaignId,
        cpf: input.customerCpf,
      },
      tipoTelefonia: 'vapi',
    }
  }

  private async sendWithRetry(payload: Record<string, unknown>): Promise<DispatchResult> {
    const maxAttempts = env.campaignMaxRetries + 1

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.sendRequest(payload)

      if (result.success) return result
      if (result.statusCode === 429 && attempt < maxAttempts - 1) {
        await this.sleep(this.calculateBackoffMs(attempt))
        continue
      }

      return result
    }

    return { success: false, statusCode: null, error: 'Máximo de tentativas atingido' }
  }

  private async sendRequest(payload: Record<string, unknown>): Promise<DispatchResult> {
    try {
      const response = await fetch(env.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-source': 'callcenter-ddm-backend',
        },
        body: JSON.stringify(payload),
      })

      return {
        success: response.ok,
        statusCode: response.status,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      }
    } catch (error) {
      return {
        success: false,
        statusCode: null,
        error: error instanceof Error ? error.message : 'Erro de rede',
      }
    }
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequestAt
    const waitMs = this.requestIntervalMs - elapsed

    if (waitMs > 0) {
      await this.sleep(waitMs)
    }

    this.lastRequestAt = Date.now()
  }

  private calculateBackoffMs(attempt: number): number {
    const baseMs = 2000
    const maxMs = 30000
    const exponential = baseMs * Math.pow(2, attempt)
    const jitter = Math.floor(Math.random() * baseMs)
    return Math.min(maxMs, exponential + jitter)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
