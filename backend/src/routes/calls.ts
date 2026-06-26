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

const extractAnalysis = (metadataRaw: unknown): Record<string, unknown> => {
  if (!metadataRaw || typeof metadataRaw !== 'object') return {}
  const raw = metadataRaw as Record<string, any>
  return raw.call?.analysis ?? raw.analysis ?? {}
}

const extractRawSummary = (metadataRaw: unknown): string | undefined => {
  if (!metadataRaw || typeof metadataRaw !== 'object') return undefined
  const raw = metadataRaw as Record<string, any>
  return raw.call?.analysis?.summary ?? raw.analysis?.summary ?? raw.summary
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

  return {
    id: call.id,
    vapiCallId: call.vapi_call_id ?? undefined,
    date: formatDate(call.started_at ?? call.created_at),
    campaignName: campaign?.nome ?? 'Direta',
    clientName: call.structured_name ?? contact?.nome ?? 'Sem nome',
    cpf: contact?.cpf ?? undefined,
    phone: call.customer_number ?? contact?.telefone ?? '',
    duration: formatDuration(call.duration_seconds),
    status: mapDashboardStatus(call.status),
    reason: call.ended_reason ?? call.status,
    success: call.success_evaluation === 'true',
    cost: Number(call.custo_total ?? 0),
    custo_stt: Number(call.custo_stt ?? 0),
    custo_tts: Number(call.custo_tts ?? 0),
    custo_vapi: Number(call.custo_vapi ?? 0),
    custo_total: Number(call.custo_total ?? 0),
    recordingUrl: call.recording_url ?? undefined,
    stereoRecordingUrl: call.stereo_recording_url ?? undefined,
    transcript: call.transcript ?? undefined,
    summary: call.summary ?? undefined,
    structured_name: call.structured_name ?? undefined,
    structured_rating_label: call.structured_rating_label ?? undefined,
    structured_rating_text: call.structured_rating_text ?? undefined,
    structured_purpose: call.structured_purpose ?? undefined,
    structured_main_points: call.structured_main_points ?? undefined,
    analysis,
    metadata_raw: call.metadata_raw,
    raw_summary: extractRawSummary(call.metadata_raw),
    raw_success_evaluation: call.success_evaluation ?? undefined,
    success_evaluation: call.success_evaluation ?? undefined,
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
