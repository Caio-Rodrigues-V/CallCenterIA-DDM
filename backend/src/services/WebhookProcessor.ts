// backend/src/services/WebhookProcessor.ts
import { CallRepository } from '../repositories/CallRepository.js'
import { CampaignRepository } from '../repositories/CampaignRepository.js'
import { AppError } from '../errors/AppError.js'
import { Logger } from './Logger.js'
import { classifyCallOutcome } from '../lib/callClassification.js'

interface VapiCallbackPayload {
  type: string
  call?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export class WebhookProcessor {
  constructor(
    private readonly callRepository: CallRepository,
    private readonly campaignRepository: CampaignRepository,
  ) {}

  async processVapiCallback(rawPayload: VapiCallbackPayload): Promise<{ callId: string }> {
    const payload = this.unwrapPayload(rawPayload)

    if (payload.type !== 'end-of-call-report') {
      throw AppError.badRequest('Tipo de evento ignorado', { type: payload.type })
    }

    const call = payload.call as Record<string, unknown>
    const metadata = this.extractMetadata(call, payload.metadata)
    const vapiCallId = call.id as string

    const existingCall = await this.findOrCreateCallRecord(vapiCallId, metadata)
    const callData = this.extractCallData(call, metadata, payload as unknown as Record<string, unknown>)

    await this.callRepository.update(existingCall.id, callData)
    await Logger.success('Webhook', 'Callback VAPI processado', { callId: existingCall.id })
    await this.updateCampaignContactStatus(existingCall, call, callData)

    return { callId: existingCall.id }
  }

  private unwrapPayload(payload: VapiCallbackPayload): VapiCallbackPayload {
    return (payload as any).message ?? payload
  }

  private extractMetadata(
    call: Record<string, unknown>,
    payloadMetadata?: Record<string, unknown>,
  ): Record<string, unknown> {
    const callMetadata =
      typeof call.metadata === 'object' && call.metadata !== null
        ? (call.metadata as Record<string, unknown>)
        : {}
    return { ...payloadMetadata, ...callMetadata }
  }

  private async findOrCreateCallRecord(
    vapiCallId: string,
    metadata: Record<string, unknown>,
  ): Promise<{ id: string; campaign_contact_id: string | null }> {
    const existingByVapiId = await this.callRepository.findByVapiCallId(vapiCallId)
    if (existingByVapiId) return existingByVapiId

    const campaignContactId = metadata.campaignContactId as string | undefined

    if (campaignContactId) {
      const orphan = await this.callRepository.findOrphanByCampaignContactId(campaignContactId)
      if (orphan) {
        await this.callRepository.update(orphan.id, { vapiCallId })
        return orphan
      }
    }

    return this.callRepository.create({
      vapiCallId,
      campaignContactId: campaignContactId ?? null,
      status: 'queued',
    })
  }

  private extractCallData(
    call: Record<string, unknown>,
    metadata: Record<string, unknown>,
    payload: Record<string, unknown>,
  ) {
    const startedAt = new Date(call.startedAt as string)
    const endedAt = new Date(call.endedAt as string)
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)

    const costs = (call.costs as Array<{ type: string; amount: number }>) ?? []
    const custoStt = costs.find(c => c.type === 'stt' || c.type === 'transcription')?.amount ?? 0
    const custoTts = costs.find(c => c.type === 'tts' || c.type === 'voice')?.amount ?? 0
    const custoVapi = costs.find(c => c.type === 'vapi' || c.type === 'service')?.amount ?? 0
    const custoTotal = costs.reduce((sum, cost) => sum + (cost.amount ?? 0), 0)

    const analysis = (call.analysis as Record<string, unknown>) ?? {}
    const structuredData = (analysis.structuredData as Record<string, unknown>) ?? {}
    const successEvaluation = this.extractSuccessEvaluation(analysis)

    const artifact = (call.artifact as Record<string, unknown>) ?? {}
    const endedReason = call.endedReason as string
    const transcript = (artifact.transcript as string) ?? null
    const summary = (analysis.summary as string) ?? null
    const structuredRatingLabel = ((structuredData.rating as any)?.label as string) ?? null
    const structuredPurpose = (structuredData.purpose as string) ?? null
    const structuredMainPoints = (structuredData.mainPoints as string) ?? null
    const outcome = classifyCallOutcome({
      endedReason,
      durationSeconds,
      transcript,
      summary,
      successEvaluation,
      structuredRatingLabel,
      structuredPurpose,
      structuredMainPoints,
    })

    return {
      campaignContactId: (metadata.campaignContactId as string) ?? null,
      startedAt: call.startedAt as string,
      endedAt: call.endedAt as string,
      endedReason,
      durationSeconds,
      custoTotal,
      custoStt,
      custoTts,
      custoVapi,
      summary,
      successEvaluation,
      transcript,
      recordingUrl: ((artifact.recording as any)?.url as string) ?? null,
      stereoRecordingUrl: ((artifact.recording as any)?.stereoRecordingUrl as string) ?? null,
      assistantId: (call.assistantId as string) ?? null,
      phoneNumberId: (call.phoneNumberId as string) ?? null,
      structuredName: (structuredData.name as string) ?? null,
      structuredRatingLabel,
      structuredRatingText: ((structuredData.rating as any)?.text as string) ?? null,
      structuredPurpose,
      structuredMainPoints,
      metadataRaw: payload as Record<string, unknown>,
      status: outcome.status,
    }
  }

  private extractSuccessEvaluation(analysis: Record<string, unknown>): string | null {
    const raw = analysis.successEvaluation
    if (raw === undefined) return null
    if (typeof raw === 'boolean') return raw ? 'true' : 'false'
    return String(raw)
  }

  private async updateCampaignContactStatus(
    existingCall: { id: string; campaign_contact_id: string | null },
    call: Record<string, unknown>,
    callData: ReturnType<typeof this.extractCallData>,
  ): Promise<void> {
    const campaignContactId = existingCall.campaign_contact_id ?? callData.campaignContactId
    if (!campaignContactId) return

    // Busca via CampaignRepository — sem Supabase
    const campaign = await this.campaignRepository.findByCampaignContactId(campaignContactId)
    if (!campaign) return

    const endedReason = call.endedReason as string

    const outcome = classifyCallOutcome({
      successEvaluation: callData.successEvaluation,
      endedReason,
      durationSeconds: callData.durationSeconds ?? 0,
      transcript: callData.transcript,
      summary: callData.summary,
      structuredRatingLabel: callData.structuredRatingLabel,
      structuredPurpose: callData.structuredPurpose,
      structuredMainPoints: callData.structuredMainPoints,
    })

    await this.campaignRepository.updateContactStatus(campaignContactId, outcome.contactStatus)
  }
}
