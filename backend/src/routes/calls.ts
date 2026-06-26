import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { mapDashboardStatus } from '../lib/callClassification.js'
import { sendCsv } from '../lib/csv.js'

const router = Router()

type CallWithRelations = Awaited<ReturnType<typeof findCalls>>[number]

const formatDate = (value: Date | null): string =>
  value
    ? value.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    : ''

const formatDuration = (seconds: number | null): string => {
  const safeSeconds = Math.max(0, seconds ?? 0)
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' ? value as Record<string, any> : {}

const extractRawCall = (metadataRaw: unknown): Record<string, any> => {
  const raw = asRecord(metadataRaw)
  return asRecord(raw.call ?? raw.message?.call ?? raw.data?.call ?? raw)
}

const extractAnalysis = (metadataRaw: unknown): Record<string, unknown> => {
  const raw = asRecord(metadataRaw)
  const rawCall = extractRawCall(metadataRaw)
  return asRecord(rawCall.analysis ?? raw.analysis ?? raw.message?.analysis)
}

const extractRawSummary = (metadataRaw: unknown): string | undefined => {
  const raw = asRecord(metadataRaw)
  const rawCall = extractRawCall(metadataRaw)
  return rawCall.analysis?.summary ?? raw.analysis?.summary ?? rawCall.summary ?? raw.summary
}

const extractRawArtifact = (metadataRaw: unknown): Record<string, any> =>
  asRecord(extractRawCall(metadataRaw).artifact)

const parseDateValue = (value: unknown): Date | null => {
  if (!value) return null
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const calculateDurationSeconds = (startedAt: Date | null, endedAt: Date | null): number | null => {
  if (!startedAt || !endedAt) return null
  return Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000))
}

const extractCost = (metadataRaw: unknown, typeNames: string[]): number => {
  const costs = extractRawCall(metadataRaw).costs
  if (!Array.isArray(costs)) return 0
  return costs
    .filter((cost: any) => typeNames.includes(String(cost?.type ?? '').toLowerCase()))
    .reduce((sum: number, cost: any) => sum + Number(cost?.amount ?? 0), 0)
}

async function findCalls(limit = 1000) {
  return prisma.call.findMany({
    orderBy: [{ started_at: 'desc' }, { created_at: 'desc' }],
    take: limit,
    include: {
      campaign_contact: {
        include: {
          campaign: true,
          contact: true,
        },
      },
    },
  })
}

const mapCall = (call: CallWithRelations) => {
  const contact = call.campaign_contact?.contact
  const campaign = call.campaign_contact?.campaign
  const analysis = extractAnalysis(call.metadata_raw)
  const rawCall = extractRawCall(call.metadata_raw)
  const artifact = extractRawArtifact(call.metadata_raw)
  const rawStartedAt = parseDateValue(rawCall.startedAt)
  const rawEndedAt = parseDateValue(rawCall.endedAt)
  const startedAt = call.started_at ?? rawStartedAt
  const endedAt = call.ended_at ?? rawEndedAt
  const durationSeconds =
    call.duration_seconds ??
    (typeof rawCall.durationSeconds === 'number' ? rawCall.durationSeconds : null) ??
    calculateDurationSeconds(startedAt, endedAt)
  const recordingUrl =
    call.recording_url ??
    artifact.recording?.url ??
    artifact.recordingUrl ??
    rawCall.recordingUrl
  const stereoRecordingUrl =
    call.stereo_recording_url ??
    artifact.recording?.stereoRecordingUrl ??
    artifact.stereoRecordingUrl ??
    rawCall.stereoRecordingUrl
  const transcript =
    call.transcript ??
    artifact.transcript ??
    rawCall.transcript
  const summary =
    call.summary ??
    extractRawSummary(call.metadata_raw)
  const successEvaluation =
    call.success_evaluation ??
    (typeof analysis.successEvaluation === 'boolean'
      ? String(analysis.successEvaluation)
      : analysis.successEvaluation ? String(analysis.successEvaluation) : undefined)
  const custoStt = Number(call.custo_stt ?? extractCost(call.metadata_raw, ['stt', 'transcription']))
  const custoTts = Number(call.custo_tts ?? extractCost(call.metadata_raw, ['tts', 'voice']))
  const custoVapi = Number(call.custo_vapi ?? extractCost(call.metadata_raw, ['vapi', 'service']))
  const custoTotal = Number(
    call.custo_total ??
    rawCall.cost ??
    rawCall.costs?.reduce?.((sum: number, cost: any) => sum + Number(cost?.amount ?? 0), 0) ??
    0,
  )

  return {
    id: call.id,
    vapiCallId: call.vapi_call_id ?? rawCall.id ?? undefined,
    date: formatDate(startedAt ?? call.created_at),
    campaignName: campaign?.nome ?? 'Direta',
    clientName: call.structured_name ?? rawCall.analysis?.structuredData?.name ?? rawCall.customer?.name ?? contact?.nome ?? 'Sem nome',
    cpf: contact?.cpf ?? undefined,
    phone: call.customer_number ?? rawCall.customer?.number ?? contact?.telefone ?? '',
    duration: formatDuration(durationSeconds),
    status: mapDashboardStatus(call.status),
    reason: call.ended_reason ?? rawCall.endedReason ?? call.status,
    success: successEvaluation === 'true',
    cost: custoTotal,
    custo_stt: custoStt,
    custo_tts: custoTts,
    custo_vapi: custoVapi,
    custo_total: custoTotal,
    recordingUrl: recordingUrl ?? undefined,
    stereoRecordingUrl: stereoRecordingUrl ?? undefined,
    transcript: transcript ?? undefined,
    summary: summary ?? undefined,
    structured_name: call.structured_name ?? rawCall.analysis?.structuredData?.name ?? undefined,
    structured_rating_label: call.structured_rating_label ?? rawCall.analysis?.structuredData?.rating?.label ?? undefined,
    structured_rating_text: call.structured_rating_text ?? rawCall.analysis?.structuredData?.rating?.text ?? undefined,
    structured_purpose: call.structured_purpose ?? rawCall.analysis?.structuredData?.purpose ?? undefined,
    structured_main_points: call.structured_main_points ?? rawCall.analysis?.structuredData?.mainPoints ?? undefined,
    analysis,
    metadata_raw: call.metadata_raw,
    raw_summary: summary,
    raw_success_evaluation: successEvaluation,
    success_evaluation: successEvaluation,
  }
}

router.get('/', async (_req, res, next) => {
  try {
    const calls = await findCalls()
    res.json(calls.map(mapCall))
  } catch (error) {
    next(error)
  }
})

router.get('/export/csv', async (_req, res, next) => {
  try {
    const calls = (await findCalls()).map(mapCall)
    sendCsv(res, `ligacoes-${new Date().toISOString().slice(0, 10)}.csv`, calls.map((call: any) => ({
      data: call.date,
      campanha: call.campaignName,
      cliente: call.clientName,
      cpf: call.cpf ?? '',
      telefone: call.phone,
      duracao: call.duration,
      status: call.status,
      motivo: call.reason,
      sucesso: call.success ? 'sim' : 'nao',
      custo: call.cost,
      gravacao: call.recordingUrl ?? '',
      resumo: call.summary ?? call.raw_summary ?? '',
    })))
  } catch (error) {
    next(error)
  }
})

router.get('/export/transcripts', async (_req, res, next) => {
  try {
    const calls = (await findCalls()).map(mapCall)
    sendCsv(res, `transcricoes-${new Date().toISOString().slice(0, 10)}.csv`, calls.map((call: any) => ({
      data: call.date,
      campanha: call.campaignName,
      cliente: call.clientName,
      telefone: call.phone,
      status: call.status,
      resumo: call.summary ?? call.raw_summary ?? '',
      transcricao: call.transcript ?? '',
    })))
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const call = await prisma.call.findUnique({
      where: { id: req.params.id },
      include: {
        campaign_contact: {
          include: {
            campaign: true,
            contact: true,
          },
        },
      },
    })
    if (!call) return res.status(404).json({ success: false, error: 'Chamada não encontrada' })
    res.json(mapCall(call))
  } catch (error) {
    next(error)
  }
})

export { router as callsRouter }
