import { Queue } from 'bullmq'
import { redis } from '../lib/redis.js'

export interface CallJobData {
  contactId: string
  campaignContactId: string
  campaignId: string
  customerNumber: string
  customerName: string
  customerCpf: string
  assistantId: string
  phoneNumberId: string
  callbackUrl: string
  attemptNumber: number
}

export const CALL_QUEUE_NAME = 'call-dispatch'

export const callQueue = new Queue<CallJobData>(CALL_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})