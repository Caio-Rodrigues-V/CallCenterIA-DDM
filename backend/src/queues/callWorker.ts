import { Worker } from 'bullmq'
import { redis } from '../lib/redis.js'
import { VapiDispatcher } from '../services/VapiDispatcher.js'
import { CampaignRepository } from '../repositories/CampaignRepository.js'
import { CALL_QUEUE_NAME, CallJobData } from './callQueue.js'
import { env } from '../config/env.js'
import { publishRealtimeEvent } from '../realtime/events.js'
import { createQueuedCallRecord } from '../lib/calls.js'

const campaignRepository = new CampaignRepository()
const vapiDispatcher = new VapiDispatcher()

const worker = new Worker<CallJobData>(
  CALL_QUEUE_NAME,
  async (job) => {
    const { data } = job

    console.log(`[worker] processando job ${job.id} — contato ${data.contactId}`)

    const queuedCallId = await createQueuedCallRecord({
      campaignContactId: data.campaignContactId,
      customerNumber: data.customerNumber,
      customerName: data.customerName,
      customerCpf: data.customerCpf,
      assistantId: data.assistantId,
      phoneNumberId: data.phoneNumberId,
    })
    await publishRealtimeEvent('calls:changed', { callId: queuedCallId, status: 'queued' })

    const result = await vapiDispatcher.dispatch(data)

    if (!result.success) {
      throw new Error(`Dispatch falhou: ${result.error} (HTTP ${result.statusCode})`)
    }

    await campaignRepository.markContactAsInProgress(
      data.campaignContactId,
      data.attemptNumber
    )
    await publishRealtimeEvent('contacts:changed', {
      campaignId: data.campaignId,
      campaignContactId: data.campaignContactId,
      status: 'em_andamento',
    })
    await publishRealtimeEvent('campaigns:changed', { campaignId: data.campaignId })

    console.log(`[worker] job ${job.id} concluído com sucesso`)
  },
  {
    connection: redis,
    concurrency: env.campaignMaxConcurrency,
  }
)

worker.on('failed', (job, error) => {
  console.error(`[worker] job ${job?.id} falhou:`, error.message)
  if (job?.data) {
    publishRealtimeEvent('logs:changed', {
      category: 'Worker',
      message: error.message,
      campaignId: job.data.campaignId,
      campaignContactId: job.data.campaignContactId,
    })
  }
})

worker.on('error', (error) => {
  console.error('[worker] erro no worker:', error.message)
})

console.log(`[worker] iniciado — fila: ${CALL_QUEUE_NAME} — concorrência: ${env.campaignMaxConcurrency}`)

export { worker }
