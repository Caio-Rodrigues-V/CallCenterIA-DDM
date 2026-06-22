import { Router } from 'express'
import { ContactImporter } from '../services/ContactImporter.js'
import { ContactRepository } from '../repositories/ContactRepository.js'
import { AppError } from '../errors/AppError.js'

const router = Router()
const contactImporter = new ContactImporter(new ContactRepository())

router.post('/import', async (req, res, next) => {
  const { campaignId, contacts } = req.body as {
    campaignId?: string
    contacts?: Array<{ nome?: string; cpf?: string; telefone?: string; instituicao?: string }>
  }

  try {
    if (!campaignId || !Array.isArray(contacts)) {
      throw AppError.badRequest('campaignId e contacts são obrigatórios')
    }

    const result = await contactImporter.importForCampaign(campaignId, contacts)
    res.json({ success: true, ...result })
  } catch (error) {
    next(error)
  }
})

export { router as contactsRouter }