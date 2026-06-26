// backend/src/repositories/CallRepository.ts
import { prisma } from '../lib/prisma.js'
import { Prisma } from '@prisma/client'
import { AppError } from '../errors/AppError.js'
import { LIMITS } from '../constants/index.js'

export interface CallRow {
  id: string
  vapi_call_id: string | null
  campaign_contact_id: string | null
  status: string
  started_at: Date | null
  ended_at: Date | null
  ended_reason: string | null
  duration_seconds: number | null
  custo_total: number | null
  custo_stt: number | null
  custo_tts: number | null
  custo_vapi: number | null
  success_evaluation: string | null
  transcript: string | null
  recording_url: string | null
  summary: string | null
  metadata_raw: unknown | null
}

export interface CreateCallInput {
  vapiCallId?: string | null
  campaignContactId?: string | null
  status: string
}

export interface UpdateCallInput {
  vapiCallId?: string
  campaignContactId?: string | null
  startedAt?: string
  endedAt?: string
  endedReason?: string
  durationSeconds?: number
  custoTotal?: number
  custoStt?: number
  custoTts?: number
  custoVapi?: number
  summary?: string | null
  successEvaluation?: string | null
  transcript?: string | null
  recordingUrl?: string | null
  stereoRecordingUrl?: string | null
  assistantId?: string | null
  phoneNumberId?: string | null
  structuredName?: string | null
  structuredRatingLabel?: string | null
  structuredRatingText?: string | null
  structuredPurpose?: string | null
  structuredMainPoints?: string | null
  metadataRaw?: Record<string, unknown>
  status?: string
}

export class CallRepository {
  async findReferenceById(
    callId: string,
  ): Promise<{ id: string; campaign_contact_id: string | null } | null> {
    try {
      return await prisma.call.findUnique({
        where: { id: callId },
        select: { id: true, campaign_contact_id: true },
      })
    } catch (error) {
      throw AppError.internal('Erro ao buscar chamada por id', error, { callId })
    }
  }

  async findByVapiCallId(
    vapiCallId: string,
  ): Promise<{ id: string; campaign_contact_id: string | null } | null> {
    try {
      return await prisma.call.findUnique({
        where: { vapi_call_id: vapiCallId },
        select: { id: true, campaign_contact_id: true },
      })
    } catch (error) {
      throw AppError.internal('Erro ao buscar chamada por vapi_call_id', error, { vapiCallId })
    }
  }

  async findOrphanByCampaignContactId(
    campaignContactId: string,
  ): Promise<{ id: string; campaign_contact_id: string | null } | null> {
    try {
      return await prisma.call.findFirst({
        where: {
          campaign_contact_id: campaignContactId,
          vapi_call_id: null,
          started_at: null,
          metadata_raw: { equals: Prisma.DbNull },
        },
        orderBy: { created_at: 'desc' },
        select: { id: true, campaign_contact_id: true },
      })
    } catch (error) {
      throw AppError.internal('Erro ao buscar chamada órfã', error, { campaignContactId })
    }
  }

  async create(
    input: CreateCallInput,
  ): Promise<{ id: string; campaign_contact_id: string | null }> {
    try {
      return await prisma.call.create({
        data: {
          vapi_call_id: input.vapiCallId ?? null,
          campaign_contact_id: input.campaignContactId ?? null,
          status: input.status,
        },
        select: { id: true, campaign_contact_id: true },
      })
    } catch (error) {
      throw AppError.internal('Erro ao criar registro de chamada', error)
    }
  }

  async update(callId: string, input: UpdateCallInput): Promise<void> {
    const data: Record<string, unknown> = {}

    if (input.vapiCallId !== undefined)           data.vapi_call_id = input.vapiCallId
    if (input.campaignContactId !== undefined)    data.campaign_contact_id = input.campaignContactId
    if (input.startedAt !== undefined)            data.started_at = new Date(input.startedAt)
    if (input.endedAt !== undefined)              data.ended_at = new Date(input.endedAt)
    if (input.endedReason !== undefined)          data.ended_reason = input.endedReason
    if (input.durationSeconds !== undefined)      data.duration_seconds = input.durationSeconds
    if (input.custoTotal !== undefined)           data.custo_total = input.custoTotal
    if (input.custoStt !== undefined)             data.custo_stt = input.custoStt
    if (input.custoTts !== undefined)             data.custo_tts = input.custoTts
    if (input.custoVapi !== undefined)            data.custo_vapi = input.custoVapi
    if (input.summary !== undefined)              data.summary = input.summary
    if (input.successEvaluation !== undefined)    data.success_evaluation = input.successEvaluation
    if (input.transcript !== undefined)           data.transcript = input.transcript
    if (input.recordingUrl !== undefined)         data.recording_url = input.recordingUrl
    if (input.stereoRecordingUrl !== undefined)   data.stereo_recording_url = input.stereoRecordingUrl
    if (input.assistantId !== undefined)          data.assistant_id = input.assistantId
    if (input.phoneNumberId !== undefined)        data.phone_number_id = input.phoneNumberId
    if (input.structuredName !== undefined)       data.structured_name = input.structuredName
    if (input.structuredRatingLabel !== undefined) data.structured_rating_label = input.structuredRatingLabel
    if (input.structuredRatingText !== undefined)  data.structured_rating_text = input.structuredRatingText
    if (input.structuredPurpose !== undefined)    data.structured_purpose = input.structuredPurpose
    if (input.structuredMainPoints !== undefined) data.structured_main_points = input.structuredMainPoints
    if (input.metadataRaw !== undefined)          data.metadata_raw = input.metadataRaw
    if (input.status !== undefined)               data.status = input.status

    try {
      await prisma.call.update({ where: { id: callId }, data })
    } catch (error) {
      throw AppError.internal('Erro ao atualizar chamada', error, { callId })
    }
  }

  async findMany(limit = LIMITS.MAX_CALLS_PER_QUERY): Promise<CallRow[]> {
    try {
      const calls = await prisma.call.findMany({
        orderBy: { started_at: 'desc' },
        take: limit,
      })
      return calls as unknown as CallRow[]
    } catch (error) {
      throw AppError.internal('Erro ao buscar chamadas', error)
    }
  }

  async findById(callId: string): Promise<CallRow> {
    try {
      const call = await prisma.call.findUnique({ where: { id: callId } })
      if (!call) throw AppError.notFound('Chamada não encontrada', { callId })
      return call as unknown as CallRow
    } catch (error) {
      if (error instanceof AppError) throw error
      throw AppError.internal('Erro ao buscar chamada', error, { callId })
    }
  }
}
