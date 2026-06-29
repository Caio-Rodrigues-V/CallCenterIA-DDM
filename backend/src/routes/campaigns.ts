// backend/src/routes/campaigns.ts
import { Router } from 'express'
import { CampaignRepository } from '../repositories/CampaignRepository.js'
import { callQueue } from '../queues/callQueue.js'
import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'
import { AppError } from '../errors/AppError.js'
import { Logger } from '../services/Logger.js'
import { publishRealtimeEvent } from '../realtime/events.js'

const router = Router()
const campaignRepository = new CampaignRepository()
const activeCampaignRuns = new Set<string>()

router.get('/', async (_req, res, next) => {
  try {
    const campaigns = await campaignRepository.findAll()
    res.json(campaigns)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  const {
    nome, instituicao, tipo_telefonia,
    assistant_vapi_id, linha_vapi_id,
    max_tentativas, intervalo_minutos,
    janela_inicio, janela_fim,
    ligacoes_simultaneas, ignore_horario,
  } = req.body

  try {
    if (!nome) throw AppError.badRequest('nome é obrigatório')
    if (!assistant_vapi_id) throw AppError.badRequest('assistant_vapi_id é obrigatório')
    if (!linha_vapi_id) throw AppError.badRequest('linha_vapi_id é obrigatório')

    const campaign = await prisma.campaign.create({
      data: {
        nome,
        instituicao: instituicao ?? '',
        tipo_telefonia: tipo_telefonia ?? 'vapi',
        assistant_vapi_id,
        linha_vapi_id,
        max_tentativas: Number(max_tentativas ?? 3),
        intervalo_minutos: Number(intervalo_minutos ?? 60),
        janela_inicio: janela_inicio ?? '08:00',
        janela_fim: janela_fim ?? '18:00',
        ligacoes_simultaneas: Number(ligacoes_simultaneas ?? 1),
        ignore_horario: Boolean(ignore_horario ?? false),
        ativa: false,
      },
    })

    await publishRealtimeEvent('campaigns:changed', { campaignId: campaign.id, action: 'created' })

    res.status(201).json(campaign)
  } catch (error) {
    next(error)
  }
})

router.post('/start', async (req, res, next) => {
  const { campaignId } = req.body as { campaignId?: string }

  try {
    if (!campaignId) throw AppError.badRequest('campaignId é obrigatório')

    if (activeCampaignRuns.has(campaignId)) {
      throw new AppError('Já existe uma execução em andamento para esta campanha', { statusCode: 409 })
    }

    activeCampaignRuns.add(campaignId)

    const campaign = await campaignRepository.findById(campaignId)

    if (!campaign.ativa) throw AppError.badRequest('Campanha não está ativa')

    const eligibleContacts = await campaignRepository.findEligibleContacts(campaignId)
    const callbackUrl = `${env.backendPublicUrl}/api/webhooks/vapi/callback`

    const vapiLines = campaign.linha_vapi_id
      .split(',')
      .map((line: string) => line.trim())
      .filter(Boolean)

    const jobs = eligibleContacts.map((cc, index) => {
      const contact = cc.contact
      const phoneNumberId = vapiLines[index % vapiLines.length]

      return {
        name: `call-${cc.id}`,
        data: {
          contactId: contact.id,
          campaignContactId: cc.id,
          campaignId,
          customerNumber: contact.telefone,
          customerName: contact.nome ?? '',
          customerCpf: contact.cpf,
          assistantId: campaign.assistant_vapi_id,
          phoneNumberId,
          callbackUrl,
          attemptNumber: cc.tentativas_realizadas,
        },
      }
    })

    const chunkSize = 1000
    for (let i = 0; i < jobs.length; i += chunkSize) {
      const chunk = jobs.slice(i, i + chunkSize)
      await callQueue.addBulk(chunk)
    }

    await Logger.success('Campaign', `Campanha ${campaignId} enfileirada`, {
      campaignId,
      totalEnqueued: jobs.length,
    })
    await publishRealtimeEvent('campaigns:changed', { campaignId, action: 'started', totalEnqueued: jobs.length })
    await publishRealtimeEvent('contacts:changed', { campaignId })

    activeCampaignRuns.delete(campaignId)

    res.json({ success: true, message: 'Campanha enfileirada', totalEnqueued: jobs.length })
  } catch (error) {
    activeCampaignRuns.delete(campaignId ?? '')
    await Logger.error('Campaign', `Erro ao iniciar campanha ${campaignId ?? 'desconhecida'}`, {
      campaignId,
      error: (error as Error).message,
    })
    next(error)
  }
})

router.patch('/:id/toggle', async (req, res, next) => {
  const { id } = req.params
  const { active } = req.body as { active: boolean }

  try {
    await campaignRepository.toggleActive(id, active)
    await publishRealtimeEvent('campaigns:changed', { campaignId: id, action: 'toggle', active })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', async (req, res, next) => {
  const { id } = req.params

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true, nome: true },
    })

    if (!campaign) throw AppError.notFound('Campanha não encontrada')

    const result = await prisma.$transaction(async (tx: any) => {
      const campaignContacts = await tx.campaignContact.findMany({
        where: { campaign_id: id },
        select: { id: true },
      })
      const campaignContactIds = campaignContacts.map((contact: any) => contact.id)

      const detachedCalls = campaignContactIds.length > 0
        ? await tx.call.updateMany({
          where: { campaign_contact_id: { in: campaignContactIds } },
          data: { campaign_contact_id: null },
        })
        : { count: 0 }

      const deletedContacts = await tx.campaignContact.deleteMany({
        where: { campaign_id: id },
      })

      await tx.campaign.delete({
        where: { id },
      })

      return {
        detachedCalls: detachedCalls.count,
        deletedContacts: deletedContacts.count,
      }
    })

    await Logger.success('Campaign', `Campanha ${id} excluída`, {
      campaignId: id,
      campaignName: campaign.nome,
      ...result,
    })
    await publishRealtimeEvent('campaigns:changed', { campaignId: id, action: 'deleted' })
    await publishRealtimeEvent('contacts:changed', { campaignId: id, action: 'campaign-deleted' })
    await publishRealtimeEvent('calls:changed', { campaignId: id, action: 'campaign-deleted' })

    res.json({ success: true, ...result })
  } catch (error) {
    next(error)
  }
})

export { router as campaignsRouter }
