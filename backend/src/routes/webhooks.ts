import { Router } from 'express'
import { WebhookProcessor } from '../services/WebhookProcessor.js'
import { CallRepository } from '../repositories/CallRepository.js'
import { CampaignRepository } from '../repositories/CampaignRepository.js'
import { AppError } from '../errors/AppError.js'

const router = Router()
const webhookProcessor = new WebhookProcessor(
  new CallRepository(),
  new CampaignRepository()
)

router.post('/vapi/callback', async (req, res, next) => {
  try {
    const result = await webhookProcessor.processVapiCallback(req.body)
    res.json({ success: true, callId: result.callId })
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 400) {
      return res.status(200).json({ success: false, error: (error as Error).message })
    }
    next(error)
  }
})

export { router as webhooksRouter }