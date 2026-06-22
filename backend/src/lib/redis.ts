import { Redis } from 'ioredis'
import { env } from '../config/env.js'

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: null,
})

redis.on('error', (error) => {
  console.error('[redis] erro de conexão:', error.message)
})