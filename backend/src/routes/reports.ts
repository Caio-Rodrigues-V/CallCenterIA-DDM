// backend/src/routes/reports.ts
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { hasAgreementSignal, hasScheduleSignal } from '../lib/callClassification.js'
import { sendCsv } from '../lib/csv.js'

const router = Router()

const serializeBigInt = (data: any): any =>
  JSON.parse(JSON.stringify(data, (_key, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ))

const getAgreementRows = async (query: { agent?: string; campaignId?: string }) => {
  const calls = await prisma.call.findMany({
    orderBy: [
      { started_at: { sort: 'desc', nulls: 'last' } },
      { created_at: 'desc' }
    ],
    include: {
      campaign_contact: {
        include: {
          campaign: true,
          contact: true,
        },
      },
    },
  })

  return calls
    .filter((call: any) => !query.agent || call.assistant_id === query.agent)
    .filter((call: any) => !query.campaignId || call.campaign_contact?.campaign_id === query.campaignId)
    .map((call: any) => {
      const hasAgreement = hasAgreementSignal({
        transcript: call.transcript,
        summary: call.summary,
        successEvaluation: call.success_evaluation,
        structuredRatingLabel: call.structured_rating_label,
        structuredPurpose: call.structured_purpose,
        structuredMainPoints: call.structured_main_points,
      })
      const scheduled = hasScheduleSignal({
        transcript: call.transcript,
        summary: call.summary,
        structuredPurpose: call.structured_purpose,
        structuredMainPoints: call.structured_main_points,
      })

      return {
        id: call.id,
        campaign_id: call.campaign_contact?.campaign_id ?? '',
        campanha_nome: call.campaign_contact?.campaign?.nome ?? 'Direta',
        agente_id: call.assistant_id ?? 'Sem agente',
        cliente: call.structured_name ?? call.campaign_contact?.contact?.nome ?? 'Sem nome',
        telefone: call.customer_number ?? call.campaign_contact?.contact?.telefone ?? '',
        cpf: call.campaign_contact?.contact?.cpf ?? '',
        referencia_data: call.started_at ?? call.created_at,
        chamadas_discadas: 1,
        chamadas_atendidas: (call.duration_seconds ?? 0) > 5 ? 1 : 0,
        acordos_fechados: hasAgreement ? 1 : 0,
        agendamentos: scheduled ? 1 : 0,
        custo_operacional: Number(call.custo_total ?? 0),
        valor_recuperado: hasAgreement ? Number(call.custo_total ?? 0) : 0,
        status: call.status,
        motivo: call.ended_reason ?? '',
        resumo: call.summary ?? '',
      }
    })
}

router.get('/kpis', async (_req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM vw_report_kpis LIMIT 1`)
    res.json(serializeBigInt((result as any[])[0] ?? {}))
  } catch (error) {
    next(error)
  }
})

router.get('/funnel', async (_req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM vw_report_funnel`)
    res.json(serializeBigInt(result))
  } catch (error) {
    next(error)
  }
})

router.get('/termination-reasons', async (_req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM vw_report_termination_reasons`)
    res.json(serializeBigInt(result))
  } catch (error) {
    next(error)
  }
})

router.get('/daily-activity', async (_req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM vw_report_daily_activity`)
    res.json(serializeBigInt(result))
  } catch (error) {
    next(error)
  }
})

router.get('/daily-costs', async (_req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM vw_report_daily_costs`)
    res.json(serializeBigInt(result))
  } catch (error) {
    next(error)
  }
})

router.get('/agreements', async (req, res, next) => {
  try {
    const rows = await getAgreementRows({
      agent: req.query.agent as string | undefined,
      campaignId: req.query.campaignId as string | undefined,
    })

    const totals = rows.reduce((acc: any, row: any) => ({
      chamadas_discadas: acc.chamadas_discadas + row.chamadas_discadas,
      chamadas_atendidas: acc.chamadas_atendidas + row.chamadas_atendidas,
      acordos_fechados: acc.acordos_fechados + row.acordos_fechados,
      agendamentos: acc.agendamentos + row.agendamentos,
      custo_operacional: acc.custo_operacional + row.custo_operacional,
      valor_recuperado: acc.valor_recuperado + row.valor_recuperado,
    }), {
      chamadas_discadas: 0,
      chamadas_atendidas: 0,
      acordos_fechados: 0,
      agendamentos: 0,
      custo_operacional: 0,
      valor_recuperado: 0,
    })

    const taxa_atendimento = totals.chamadas_discadas > 0
      ? Math.round((totals.chamadas_atendidas / totals.chamadas_discadas) * 100)
      : 0
    const taxa_conversao = totals.chamadas_atendidas > 0
      ? Math.round((totals.acordos_fechados / totals.chamadas_atendidas) * 100)
      : 0

    const agents = Array.from(new Set(rows.map((row: any) => row.agente_id))).filter(Boolean).sort()

    res.json({
      ...totals,
      taxa_atendimento,
      taxa_conversao,
      agents,
      rows,
    })
  } catch (error) {
    next(error)
  }
})

router.get('/agreements/export', async (req, res, next) => {
  try {
    const rows = await getAgreementRows({
      agent: req.query.agent as string | undefined,
      campaignId: req.query.campaignId as string | undefined,
    })

    sendCsv(res, `acordos-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((row: any) => ({
      data: row.referencia_data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      campanha: row.campanha_nome,
      agente: row.agente_id,
      cliente: row.cliente,
      cpf: row.cpf,
      telefone: row.telefone,
      atendida: row.chamadas_atendidas ? 'sim' : 'nao',
      acordo: row.acordos_fechados ? 'sim' : 'nao',
      agendamento: row.agendamentos ? 'sim' : 'nao',
      status: row.status,
      motivo: row.motivo,
      resumo: row.resumo,
    })))
  } catch (error) {
    next(error)
  }
})

export { router as reportsRouter }

