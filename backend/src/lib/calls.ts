// backend/src/lib/calls.ts
import { env } from '../config/env.js'
import { prisma } from './prisma.js'

const QUEUED_REUSE_WINDOW_MS = 30 * 60 * 1000

interface QueuedCallInput {
  campaignContactId?: string | null
  contactPhoneId?: string | null
  customerNumber?: string | null
  campaignName?: string | null
  customerCpf?: string | null
  customerName?: string | null
  assistantId?: string | null
  phoneNumberId?: string | null
}

function normalizeBaseUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString().replace(/\/+$/, '')
  } catch {
    return null
  }
}

function isLoopbackUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1'
  } catch {
    return false
  }
}

export async function getBackendPublicUrl(): Promise<string> {
  // Sem app_settings no novo schema — usa direto a env
  const fallbackUrl = normalizeBaseUrl(env.backendPublicUrl) || `http://localhost:${env.port}`
  if (isLoopbackUrl(fallbackUrl)) {
    console.warn(
      `[calls] BACKEND_PUBLIC_URL em modo loopback (${fallbackUrl}). ` +
        'Callbacks externos da VAPI/n8n nao vao conseguir atingir esse endereco. ' +
        'Configure a env BACKEND_PUBLIC_URL com uma URL publica.',
    )
  }
  return fallbackUrl
}

export async function createQueuedCallRecord(input: QueuedCallInput): Promise<string | null> {
  try {
    if (input.campaignContactId) {
      const reuseWindowStart = new Date(Date.now() - QUEUED_REUSE_WINDOW_MS)

      const existingQueued = await prisma.call.findFirst({
        where: {
          campaign_contact_id: input.campaignContactId,
          vapi_call_id: null,
          started_at: null,
          metadata_raw: null,
          created_at: { gte: reuseWindowStart },
        },
        orderBy: { created_at: 'desc' },
        select: { id: true },
      })

      if (existingQueued?.id) {
        await prisma.call.update({
          where: { id: existingQueued.id },
          data: {
            customer_number: input.customerNumber ?? null,
            assistant_id: input.assistantId ?? null,
            phone_number_id: input.phoneNumberId ?? null,
            status: 'queued',
          },
        })
        return existingQueued.id
      }
    }

    const created = await prisma.call.create({
      data: {
        campaign_contact_id: input.campaignContactId ?? null,
        customer_number: input.customerNumber ?? null,
        assistant_id: input.assistantId ?? null,
        phone_number_id: input.phoneNumberId ?? null,
        status: 'queued',
      },
      select: { id: true },
    })

    return created.id
  } catch (error) {
    console.warn('[calls] nao foi possivel criar registro queued em calls:', error)
    return null
  }
}
