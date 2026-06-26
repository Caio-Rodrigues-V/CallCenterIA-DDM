import { Router } from 'express'
import { WebhookProcessor } from '../services/WebhookProcessor.js'
import { CallRepository } from '../repositories/CallRepository.js'
import { CampaignRepository } from '../repositories/CampaignRepository.js'
import { AppError } from '../errors/AppError.js'
import { Logger } from '../services/Logger.js'
import { publishRealtimeEvent } from '../realtime/events.js'

const router = Router()
const webhookProcessor = new WebhookProcessor(
  new CallRepository(),
  new CampaignRepository()
)

router.post('/vapi/callback', async (req, res, next) => {
  try {
    const payload = (req.body as any)?.message ?? req.body
    await Logger.info('Webhook', 'Callback VAPI recebido', {
      type: payload?.type,
      callId: payload?.call?.id,
      hasMetadata: Boolean(payload?.metadata || payload?.call?.metadata),
    })

    const result = await webhookProcessor.processVapiCallback(req.body)
    await publishRealtimeEvent('calls:changed', { callId: result.callId })
    await publishRealtimeEvent('contacts:changed', { callId: result.callId })
    await publishRealtimeEvent('campaigns:changed', { callId: result.callId })
    await publishRealtimeEvent('reports:changed', { callId: result.callId })
    await publishRealtimeEvent('quality:changed', { callId: result.callId })
    res.json({ success: true, callId: result.callId })
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 400) {
      await Logger.warn('Webhook', 'Callback VAPI ignorado', {
        error: error.message,
        context: error.context,
      })
      return res.status(200).json({ success: false, error: (error as Error).message })
    }
    await Logger.error('Webhook', 'Erro ao processar callback VAPI', {
      error: error instanceof Error ? error.message : String(error),
    })
    next(error)
  }
})

export { router as webhooksRouter }
