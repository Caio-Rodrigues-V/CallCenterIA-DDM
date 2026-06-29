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
  [key: string]: any
}

export class WebhookProcessor {
  constructor(
    private readonly callRepository: CallRepository,
    private readonly campaignRepository: CampaignRepository,
  ) {}

  async processVapiCallback(rawPayload: VapiCallbackPayload): Promise<{ callId: string }> {
    const payload = this.unwrapPayload(rawPayload)

    const call = this.extractCall(payload)
    const metadata = this.extractMetadata(call, payload.metadata)
    const vapiCallId = typeof call.id === 'string' ? call.id : null

    const existingCall = await this.findOrCreateCallRecord(vapiCallId, metadata)
    const startedAtVal = (call.startedAt ?? payload.startedAt) as string | undefined
    const endedAtVal = (call.endedAt ?? payload.endedAt) as string | undefined
    const isFinalReport = payload.type === 'end-of-call-report' && startedAtVal && endedAtVal

    if (isFinalReport) {
      const callData = this.extractCallData(call, metadata, payload as unknown as Record<string, unknown>)
      await this.callRepository.update(existingCall.id, callData)
      await Logger.success('Webhook', 'Callback VAPI processado', { callId: existingCall.id, type: payload.type })
      await this.updateCampaignContactStatus(existingCall, call, callData)
    } else {
      await this.callRepository.update(existingCall.id, this.extractPartialCallData(call, metadata, payload as unknown as Record<string, unknown>))
      await Logger.info('Webhook', 'Callback VAPI salvo parcialmente', {
        callId: existingCall.id,
        type: payload.type,
        vapiCallId,
      })
    }

    return { callId: existingCall.id }
  }

  private unwrapPayload(payload: VapiCallbackPayload): VapiCallbackPayload {
    return (payload as any).message ?? payload
  }

  private extractCall(payload: VapiCallbackPayload): Record<string, unknown> {
    const anyPayload = payload as any
    if (anyPayload.call && typeof anyPayload.call === 'object') return anyPayload.call
    if (anyPayload.id || anyPayload.startedAt || anyPayload.endedAt) return anyPayload
    return {}
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
    vapiCallId: string | null,
    metadata: Record<string, unknown>,
  ): Promise<{ id: string; campaign_contact_id: string | null }> {
    const callRecordId = metadata.callRecordId as string | undefined
    if (callRecordId) {
      const existingById = await this.callRepository.findReferenceById(callRecordId)
      if (existingById) {
        if (vapiCallId) await this.callRepository.update(existingById.id, { vapiCallId })
        return existingById
      }
    }

    if (vapiCallId) {
      const existingByVapiId = await this.callRepository.findByVapiCallId(vapiCallId)
      if (existingByVapiId) return existingByVapiId
    }

    const campaignContactId = metadata.campaignContactId as string | undefined

    if (campaignContactId) {
      const orphan = await this.callRepository.findOrphanByCampaignContactId(campaignContactId)
      if (orphan) {
        if (vapiCallId) await this.callRepository.update(orphan.id, { vapiCallId })
        return orphan
      }
    }

    return this.callRepository.create({
      vapiCallId,
      campaignContactId: campaignContactId ?? null,
      status: 'callback-received',
    })
  }

  private extractPartialCallData(
    call: Record<string, unknown>,
    metadata: Record<string, unknown>,
    payload: Record<string, unknown>,
  ) {
    const status =
      (call.status as string | undefined) ??
      (payload.type as string | undefined) ??
      'callback-received'

    const startedAtVal = call.startedAt ?? payload.startedAt
    const endedAtVal = call.endedAt ?? payload.endedAt
    const endedReasonVal = call.endedReason ?? payload.endedReason

    return {
      vapiCallId: typeof call.id === 'string' ? call.id : undefined,
      campaignContactId: (metadata.campaignContactId as string) ?? undefined,
      startedAt: typeof startedAtVal === 'string' ? startedAtVal : undefined,
      endedAt: typeof endedAtVal === 'string' ? endedAtVal : undefined,
      endedReason: typeof endedReasonVal === 'string' ? endedReasonVal : undefined,
      assistantId: typeof (call.assistantId ?? payload.assistantId) === 'string' ? (call.assistantId ?? payload.assistantId) as string : undefined,
      phoneNumberId: typeof (call.phoneNumberId ?? payload.phoneNumberId) === 'string' ? (call.phoneNumberId ?? payload.phoneNumberId) as string : undefined,
      metadataRaw: payload,
      status,
    }
  }

  private extractCallData(
    call: Record<string, unknown>,
    metadata: Record<string, unknown>,
    payload: Record<string, unknown>,
  ) {
    const startedAtVal = (call.startedAt ?? payload.startedAt) as string
    const endedAtVal = (call.endedAt ?? payload.endedAt) as string
    const startedAt = new Date(startedAtVal)
    const endedAt = new Date(endedAtVal)
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)

    const costs = ((call.costs ?? payload.costs) as Array<{ type: string; amount: number } | undefined> | null) ?? []
    const custoStt = costs.find(c => c?.type === 'stt' || c?.type === 'transcription' || c?.type === 'transcriber')?.amount ?? 0
    const custoTts = costs.find(c => c?.type === 'tts' || c?.type === 'voice')?.amount ?? 0
    const custoVapi = costs.find(c => c?.type === 'vapi' || c?.type === 'service')?.amount ?? 0
    const custoTotal = costs.reduce((sum, cost) => sum + (cost?.amount ?? 0), 0)

    const anyCall = call as any
    const analysis = ((anyCall.analysis ?? payload.analysis) as Record<string, unknown> | null) ?? {}
    const structuredData = (analysis.structuredData as Record<string, unknown> | null) ?? {}
    const successEvaluation = this.extractSuccessEvaluation(analysis)

    const artifact = ((anyCall.artifact ?? payload.artifact) as Record<string, unknown> | null) ?? {}
    const endedReason = (call.endedReason ?? payload.endedReason) as string
    const transcript = (artifact.transcript ?? payload.transcript ?? anyCall.transcript) as string | null
    const summary = (analysis.summary ?? payload.summary) as string | null
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
      startedAt: startedAtVal,
      endedAt: endedAtVal,
      endedReason,
      durationSeconds,
      custoTotal,
      custoStt,
      custoTts,
      custoVapi,
      summary,
      successEvaluation,
      transcript,
      recordingUrl: ((artifact.recording as any)?.url ?? (payload.recordingUrl as string | undefined)) ?? null,
      stereoRecordingUrl: ((artifact.recording as any)?.stereoRecordingUrl ?? (payload.stereoRecordingUrl as string | undefined)) ?? null,
      assistantId: (call.assistantId ?? payload.assistantId) as string | null,
      phoneNumberId: (call.phoneNumberId ?? payload.phoneNumberId) as string | null,
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

    const campaign = await this.campaignRepository.findByCampaignContactId(campaignContactId)
    if (!campaign) return

    const endedReason = (call.endedReason ?? callData.endedReason) as string

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
