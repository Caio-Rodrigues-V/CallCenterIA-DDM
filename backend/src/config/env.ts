// backend/src/config/env.ts
import { z } from 'zod'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const envSchema = z.object({
  PORT:                        z.string().default('4000'),
  FRONTEND_ORIGIN:             z.string().default('http://localhost:3000'),
  BACKEND_PUBLIC_URL:          z.string().default('http://localhost:4000'),
  DATABASE_URL:                z.string().min(1, 'DATABASE_URL é obrigatório'),
  REDIS_URL:                   z.string().min(1, 'REDIS_URL é obrigatório'),
  VAPI_API_KEY:                z.string().min(1, 'VAPI_API_KEY é obrigatório'),
  N8N_WEBHOOK_URL:             z.string().min(1, 'N8N_WEBHOOK_URL é obrigatório'),
  CAMPAIGN_MAX_CONCURRENCY:    z.string().default('6'),
  CAMPAIGN_REQUEST_INTERVAL_MS: z.string().default('250'),
  CAMPAIGN_MAX_RETRIES:        z.string().default('5'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = {
  port:                    Number(parsed.data.PORT),
  frontendOrigin:          parsed.data.FRONTEND_ORIGIN,
  backendPublicUrl:        parsed.data.BACKEND_PUBLIC_URL,
  databaseUrl:             parsed.data.DATABASE_URL,
  redisUrl:                parsed.data.REDIS_URL,
  vapiApiKey:              parsed.data.VAPI_API_KEY,
  n8nWebhookUrl:           parsed.data.N8N_WEBHOOK_URL,
  campaignMaxConcurrency:  Number(parsed.data.CAMPAIGN_MAX_CONCURRENCY),
  campaignRequestIntervalMs: Number(parsed.data.CAMPAIGN_REQUEST_INTERVAL_MS),
  campaignMaxRetries:      Number(parsed.data.CAMPAIGN_MAX_RETRIES),
} as const
