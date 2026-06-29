// backend/src/routes/contacts.ts
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { ContactRepository } from '../repositories/ContactRepository.js'
import { ContactImporter } from '../services/ContactImporter.js'
import { AppError } from '../errors/AppError.js'
import { publishRealtimeEvent } from '../realtime/events.js'

const router = Router()
const contactRepository = new ContactRepository()
const contactImporter = new ContactImporter(contactRepository)

// Lista campaign_contacts com joins
router.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.campaignContact.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
      select: {
        id: true,
        contact_id: true,
        status: true,
        tentativas_realizadas: true,
        ultima_tentativa: true,
        campaign: { select: { id: true, nome: true } },
        contact: { select: { nome: true, cpf: true, telefone: true, instituicao: true } },
      },
    })
    res.json(rows)
  } catch (error) {
    next(error)
  }
})

// Importar contatos para campanha
router.post('/import', async (req, res, next) => {
  const { campaignId, contacts } = req.body as { campaignId?: string; contacts?: any[] }
  try {
    if (!campaignId) throw AppError.badRequest('campaignId é obrigatório')
    if (!contacts?.length) throw AppError.badRequest('contacts é obrigatório')
    const result = await contactImporter.importForCampaign(campaignId, contacts)
    await publishRealtimeEvent('contacts:changed', { campaignId, action: 'import', linked: result.linked })
    await publishRealtimeEvent('campaigns:changed', { campaignId })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

// Resetar tentativas
router.patch('/:id/reset', async (req, res, next) => {
  try {
    await prisma.campaignContact.update({
      where: { id: req.params.id },
      data: { tentativas_realizadas: 0, status: 'pendente', ultima_tentativa: null },
    })
    await publishRealtimeEvent('contacts:changed', { campaignContactId: req.params.id, action: 'reset' })
    await publishRealtimeEvent('campaigns:changed', {})
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// Atualizar status do campaign_contact (usado pelo N8N)
router.patch('/campaign-contact/status', async (req, res, next) => {
  const { campaignContactId, status } = req.body as { campaignContactId?: string; status?: string }
  try {
    if (!campaignContactId) throw AppError.badRequest('campaignContactId é obrigatório')
    if (!status) throw AppError.badRequest('status é obrigatório')

    await prisma.campaignContact.update({
      where: { id: campaignContactId },
      data: { status, ultima_tentativa: new Date() },
    })

    await publishRealtimeEvent('contacts:changed', { campaignContactId, status })
    await publishRealtimeEvent('campaigns:changed', {})

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// Deletar campaign_contact
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.campaignContact.delete({ where: { id: req.params.id } })
    await publishRealtimeEvent('contacts:changed', { campaignContactId: req.params.id, action: 'delete' })
    await publishRealtimeEvent('campaigns:changed', {})
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// Editar contact (dados do contato em si)
router.patch('/:contactId/contact', async (req, res, next) => {
  const { nome, telefone, cpf } = req.body
  try {
    await prisma.contact.update({
      where: { id: req.params.contactId },
      data: { nome, telefone, cpf },
    })
    await publishRealtimeEvent('contacts:changed', { contactId: req.params.contactId, action: 'edit' })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export { router as contactsRouter }
