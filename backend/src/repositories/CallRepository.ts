import { supabaseAdmin } from '../lib/supabase.js'
import { AppError } from '../errors/AppError.js'
import { LIMITS } from '../constants/index.js'

export interface CallRow {
  id: string
  vapi_call_id: string | null
  campaign_contact_id: string | null
  status: string
  started_at: string | null
  ended_at: string | null
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
  metadata_raw: Record<string, unknown> | null
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
  async findByVapiCallId(vapiCallId: string): Promise<{ id: string; campaign_contact_id: string | null } | null> {
    const { data, error } = await supabaseAdmin
      .from('calls')
      .select('id, campaign_contact_id')
      .eq('vapi_call_id', vapiCallId)
      .maybeSingle()

    if (error) {
      throw AppError.internal('Erro ao buscar chamada por vapi_call_id', error, { vapiCallId })
    }

    return data
  }

  async findOrphanByCampaignContactId(campaignContactId: string): Promise<{ id: string; campaign_contact_id: string | null } | null> {
    const { data, error } = await supabaseAdmin
      .from('calls')
      .select('id, campaign_contact_id')
      .eq('campaign_contact_id', campaignContactId)
      .is('vapi_call_id', null)
      .is('started_at', null)
      .is('metadata_raw', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw AppError.internal('Erro ao buscar chamada órfã', error, { campaignContactId })
    }

    return data
  }

  async create(input: CreateCallInput): Promise<{ id: string; campaign_contact_id: string | null }> {
    const { data, error } = await supabaseAdmin
      .from('calls')
      .insert({
        vapi_call_id: input.vapiCallId ?? null,
        campaign_contact_id: input.campaignContactId ?? null,
        status: input.status,
      })
      .select('id, campaign_contact_id')
      .maybeSingle()

    if (error || !data) {
      throw AppError.internal('Erro ao criar registro de chamada', error)
    }

    return data
  }

  async update(callId: string, input: UpdateCallInput): Promise<void> {
    const payload: Record<string, unknown> = {}

    if (input.vapiCallId !== undefined) payload.vapi_call_id = input.vapiCallId
    if (input.campaignContactId !== undefined) payload.campaign_contact_id = input.campaignContactId
    if (input.startedAt !== undefined) payload.started_at = input.startedAt
    if (input.endedAt !== undefined) payload.ended_at = input.endedAt
    if (input.endedReason !== undefined) payload.ended_reason = input.endedReason
    if (input.durationSeconds !== undefined) payload.duration_seconds = input.durationSeconds
    if (input.custoTotal !== undefined) payload.custo_total = input.custoTotal
    if (input.custoStt !== undefined) payload.custo_stt = input.custoStt
    if (input.custoTts !== undefined) payload.custo_tts = input.custoTts
    if (input.custoVapi !== undefined) payload.custo_vapi = input.custoVapi
    if (input.summary !== undefined) payload.summary = input.summary
    if (input.successEvaluation !== undefined) payload.success_evaluation = input.successEvaluation
    if (input.transcript !== undefined) payload.transcript = input.transcript
    if (input.recordingUrl !== undefined) payload.recording_url = input.recordingUrl
    if (input.stereoRecordingUrl !== undefined) payload.stereo_recording_url = input.stereoRecordingUrl
    if (input.assistantId !== undefined) payload.assistant_id = input.assistantId
    if (input.phoneNumberId !== undefined) payload.phone_number_id = input.phoneNumberId
    if (input.structuredName !== undefined) payload.structured_name = input.structuredName
    if (input.structuredRatingLabel !== undefined) payload.structured_rating_label = input.structuredRatingLabel
    if (input.structuredRatingText !== undefined) payload.structured_rating_text = input.structuredRatingText
    if (input.structuredPurpose !== undefined) payload.structured_purpose = input.structuredPurpose
    if (input.structuredMainPoints !== undefined) payload.structured_main_points = input.structuredMainPoints
    if (input.metadataRaw !== undefined) payload.metadata_raw = input.metadataRaw
    if (input.status !== undefined) payload.status = input.status

    const { error } = await supabaseAdmin
      .from('calls')
      .update(payload)
      .eq('id', callId)

    if (error) {
      throw AppError.internal('Erro ao atualizar chamada', error, { callId })
    }
  }

  async findMany(limit = LIMITS.MAX_CALLS_PER_QUERY): Promise<CallRow[]> {
    const { data, error } = await supabaseAdmin
      .from('calls')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw AppError.internal('Erro ao buscar chamadas', error)
    }

    return (data ?? []) as CallRow[]
  }

  async findById(callId: string): Promise<CallRow> {
    const { data, error } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('id', callId)
      .maybeSingle()

    if (error || !data) {
      throw AppError.notFound('Chamada não encontrada', { callId })
    }

    return data as CallRow
  }
}