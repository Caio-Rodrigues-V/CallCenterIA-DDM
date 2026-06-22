import { Router } from 'express'
import { CampaignRepository } from '../repositories/CampaignRepository.js'
import { callQueue } from '../queues/callQueue.js'
import { env } from '../config/env.js'
import { AppError } from '../errors/AppError.js'
import { Logger } from '../services/Logger.js'

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

router.post('/start', async (req, res, next) => {
  const { campaignId } = req.body as { campaignId?: string }

  try {
    if (!campaignId) {
      throw AppError.badRequest('campaignId é obrigatório')
    }

    if (activeCampaignRuns.has(campaignId)) {
      throw new AppError('Já existe uma execução em andamento para esta campanha', { statusCode: 409 })
    }

    activeCampaignRuns.add(campaignId)

    const campaign = await campaignRepository.findById(campaignId)

    if (!campaign.ativa) {
      throw AppError.badRequest('Campanha não está ativa')
    }

    const eligibleContacts = await campaignRepository.findEligibleContacts(campaignId)
    const callbackUrl = `${env.backendPublicUrl}/api/webhooks/vapi/callback`

    const vapiLines = campaign.linha_vapi_id
      .split(',')
      .map(line => line.trim())
      .filter(Boolean)

    const jobs = eligibleContacts.map((cc, index) => {
      const contact = Array.isArray(cc.contacts) ? cc.contacts[0] : cc.contacts
      const phoneNumberId = vapiLines[index % vapiLines.length]

      return {
        name: `call-${cc.id}`,
        data: {
          contactId: contact.id,
          campaignContactId: cc.id,
          campaignId,
          customerNumber: contact.telefone,
          customerName: contact.nome,
          customerCpf: contact.cpf,
          assistantId: campaign.assistant_vapi_id,
          phoneNumberId,
          callbackUrl,
          attemptNumber: cc.tentativas_realizadas,
        },
      }
    })

    await callQueue.addBulk(jobs)

    await Logger.success('Campaign', `Campanha ${campaignId} enfileirada`, {
      campaignId,
      totalEnqueued: jobs.length,
    })

    activeCampaignRuns.delete(campaignId)

    res.json({
      success: true,
      message: 'Campanha enfileirada',
      totalEnqueued: jobs.length,
    })
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
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export { router as campaignsRouter }